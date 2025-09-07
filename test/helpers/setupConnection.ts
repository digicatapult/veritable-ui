import 'reflect-metadata'

import { RegistryType } from '../../src/models/db/types.js'
import { CountryCode } from '../../src/models/stringTypes.js'
import { fetchGet, fetchPost } from './routeHelper.js'
import { checkEmails, extractInvite, extractPin } from './smtpEmails.js'
import { delay } from './util.js'

export async function withConnection(inviterUrl: string, receiverUrl: string) {
  const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89ab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/g
  let SEARCH_TERM: string

  // Create the invitation
  await fetchPost(`${inviterUrl}/connection/new/create-invitation`, {
    companyNumber: '04659351',
    email: 'alice@testmail.com',
    action: 'submit',
    registryCountryCode: 'GB' as CountryCode,
    selectedRegistry: 'company_house' as RegistryType,
  })

  // Get pin and invite for the counterparty
  const adminEmail = await checkEmails('admin@veritable.com')
  const inviterPin = await extractPin(adminEmail.id)
  if (!inviterPin) throw new Error(`PIN for ${receiverUrl} was not found.`)

  const inviteEmail = await checkEmails('alice@testmail.com')
  const inviteBase64 = await extractInvite(inviteEmail.id)
  if (!inviteBase64) throw new Error(`Invitation for ${receiverUrl} was not found`)

  // Counterparty receives the invitation
  await fetchPost(`${receiverUrl}/connection/new/receive-invitation`, {
    invite: inviteBase64,
    action: 'createConnection',
  })

  // Confirm the local connection record has been created
  SEARCH_TERM = 'DIGI'
  let inviterConnectionIdAtReceiver: string | undefined

  for (let attempt = 1; attempt <= 100; attempt++) {
    await delay(100)
    const res = await fetchGet(`${receiverUrl}/connection?search=${SEARCH_TERM}`)
    const text = await res.text()
    inviterConnectionIdAtReceiver = text.match(uuidRegex)?.[0]

    if (inviterConnectionIdAtReceiver) {
      break
    }

    if (attempt === 100) {
      throw new Error(`No connection ID after 100 retries at ${receiverUrl}`)
    }
  }

  // Submit the pin code at the receiver
  await fetchPost(`${receiverUrl}/connection/${inviterConnectionIdAtReceiver}/pin-submission`, {
    action: 'submitPinCode',
    pin: inviterPin,
    stepCount: '3',
  })

  // Get the responding pin code from the counterparty to the original inviter
  const receiverEmail = await checkEmails('admin@veritable.com')
  const receiverPin = await extractPin(receiverEmail.id)
  if (!receiverPin) throw new Error(`PIN for ${inviterUrl} was not found.`)

  // Get the connection id for the counterparty at the original inviter
  const connections = await fetchGet(`${inviterUrl}/connection?search=OFFSHORE`)
  const [receiverConnectionIdAtInviter] = (await connections.text()).match(uuidRegex) || []
  if (!receiverConnectionIdAtInviter) throw new Error(`No connection ID at ${inviterUrl}`)

  // Original inviter submits the pin code for the counterparty
  await fetchPost(`${inviterUrl}/connection/${receiverConnectionIdAtInviter}/pin-submission`, {
    action: 'submitPinCode',
    pin: receiverPin,
    stepCount: '2',
  })

  // Confirm the connection is successful at the original inviter
  SEARCH_TERM = 'OFFSHORE'

  for (let attempt = 1; attempt <= 100; attempt++) {
    await delay(100)
    const res = await fetchGet(`${inviterUrl}/connection?search=${SEARCH_TERM}`)
    const text = await res.text()

    if (/data-status="success"/.test(text)) {
      return
    }

    if (attempt === 100) {
      throw new Error(`Connection unsuccessful after 100 retries: ${inviterUrl}`)
    }
  }
}
