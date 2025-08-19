import 'reflect-metadata'

import { CountryCode } from '../../src/models/stringTypes.js'
import { fetchGet, fetchPost } from './routeHelper.js'
import { checkEmails, extractInvite, extractPin } from './smtpEmails.js'
import { delay } from './util.js'

export async function withConnection(inviterUrl: string, receiverUrl: string) {
  const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89ab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/g

  // Create the invitation
  await fetchPost(`${inviterUrl}/connection/new/create-invitation`, {
    companyNumber: '04659351',
    email: 'alice@testmail.com',
    action: 'submit',
    registryCountryCode: 'GB' as CountryCode,
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
  let attempt = 0
  let inviterConnectionIdAtReceiver: string | undefined
  while (attempt < 10) {
    attempt++
    await delay(1000)
    const receiverConnection = await fetchGet(`${receiverUrl}/connection?search=DIGI`)
    ;[inviterConnectionIdAtReceiver] = (await receiverConnection.text()).match(uuidRegex) || []
    if (inviterConnectionIdAtReceiver) {
      break
    }
    if (attempt === 10) {
      throw new Error(`No connection ID after 10 retries at ${receiverUrl}`)
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
    stepCount: '3',
  })

  // Confirm the connection is successful at the original inviter
  attempt = 0
  while (attempt < 20) {
    attempt++
    await delay(2000) // Can take 10-12 seconds to connect
    const inviterConnection = await fetchGet(`${inviterUrl}/connection?search=OFFSHORE`)
    const [inviterConnectionStatus] = (await inviterConnection.text()).match('data-status="success"') || []
    if (inviterConnectionStatus) {
      break
    }
    if (attempt === 10) {
      throw new Error(`Connection unsuccessful after 10 retries: ${inviterUrl}`)
    }
  }
}
