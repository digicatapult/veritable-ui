import 'reflect-metadata'

import { RegistryType } from '../../src/models/db/types.js'
import { CountryCode } from '../../src/models/stringTypes.js'
import { fetchGet, fetchPost } from './routeHelper.js'
import { checkEmails, extractInvite, extractPin } from './smtpEmails.js'
import { delay } from './util.js'
export async function withConnection(inviterUrl: string, receiverUrl: string) {
  const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89ab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/g

  await fetchPost(`${inviterUrl}/connection/new/create-invitation`, {
    companyNumber: '04659351',
    email: 'alice@testmail.com',
    action: 'submit',
    registryCountryCode: 'GB' as CountryCode,
    selectedRegistry: 'company_house' as RegistryType,
  })

  // Get pin and invite for the new holder
  const adminEmail = await checkEmails('admin@veritable.com')
  const inviterPin = await extractPin(adminEmail.id)
  if (!inviterPin) throw new Error(`PIN for ${receiverUrl} was not found.`)

  const inviteEmail = await checkEmails('alice@testmail.com')
  const inviteBase64 = await extractInvite(inviteEmail.id)
  if (!inviteBase64) throw new Error('Invitation for Bob was not found.')

  // verify and validate a new connection - holder
  const receive = await fetchPost(`${receiverUrl}/connection/new/receive-invitation`, {
    invite: inviteBase64,
    action: 'createConnection',
  })
  const [holderConnectionId] = (await receive.text()).match(uuidRegex) || []
  if (!holderConnectionId) throw new Error(`Connection was not found`)

  let retries = 30

  while (retries) {
    await delay(500)
    const receiverConnection = await fetchGet(`${receiverUrl}/connection?search=DIGI`)
    const [receiverConnectionStatus] = (await receiverConnection.text()).match('Verification Code') || []
    if (receiverConnectionStatus) {
      retries = 0
    } else if (retries === 1 && !receiverConnectionStatus) {
      throw new Error('timeout')
    } else {
      retries--
    }
  }

  await fetchPost(`${receiverUrl}/connection/${holderConnectionId}/pin-submission`, {
    action: 'submitPinCode',
    pin: inviterPin,
    stepCount: '3',
  })

  const receiverEmail = await checkEmails('admin@veritable.com')
  const receiverPin = await extractPin(receiverEmail.id)

  const connections = await fetchGet(`${inviterUrl}/connection?search=OFFSHORE`)
  const [inviterConnectionId] = (await connections.text()).match(uuidRegex) || []
  if (!receiverPin || !inviterConnectionId) {
    throw new Error(`PIN ${receiverPin} or Connection ID ${inviterConnectionId} not found`)
  }

  await fetchPost(`${inviterUrl}/connection/${inviterConnectionId}/pin-submission`, {
    action: 'submitPinCode',
    pin: receiverPin,
    stepCount: '2',
  })

  retries = 30
  while (retries) {
    await delay(500)
    const inviterConnection = await fetchGet(`${inviterUrl}/connection?search=OFFSHORE`)
    const [inviterConnectionStatus] = (await inviterConnection.text()).match('Send Query') || []
    if (inviterConnectionStatus) {
      retries = 0
    } else if (retries === 1 && !inviterConnectionStatus) {
      throw new Error('timeout')
    } else {
      retries--
    }
  }
}
