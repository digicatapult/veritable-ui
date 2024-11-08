import 'reflect-metadata'

import { fetchGet, fetchPost } from '../../helpers/routeHelper.js'
import { delay } from '../../helpers/util.js'
import { checkEmails, extractInvite, extractPin } from './smtpEmails.js'

export async function withConnection(invitatorUrl: string, receiverUrl: string) {
  const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89ab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/g

  await fetchPost(`${invitatorUrl}/connection/new/create-invitation`, {
    companyNumber: '04659351',
    email: 'alice@testmail.com',
    action: 'submit',
  })

  // Get pin and invite for the new holder
  const adminEmail = await checkEmails('admin@veritable.com')
  const invitatorPin = await extractPin(adminEmail.id)
  if (!invitatorPin) throw new Error(`PIN for ${receiverUrl} was not found.`)

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

  await fetchPost(`${receiverUrl}/connection/${holderConnectionId}/pin-submission`, {
    action: 'submitPinCode',
    pin: invitatorPin,
    stepCount: '3',
  })

  const receiverEmail = await checkEmails('admin@veritable.com')
  const receiverPin = await extractPin(receiverEmail.id)

  await delay(1000)
  const connections = await fetchGet(`${invitatorUrl}/connection?search=OFFSHORE`)
  const [invitatorConnectionId] = (await connections.text()).match(uuidRegex) || []
  if (!receiverPin || !invitatorConnectionId) {
    throw new Error(`PIN ${receiverPin} or Connection ID ${invitatorConnectionId} not found`)
  }

  await fetchPost(`${invitatorUrl}/connection/${invitatorConnectionId}/pin-submission`, {
    action: 'submitPinCode',
    pin: receiverPin,
    stepCount: '2',
  })
  await delay(2000)
}
