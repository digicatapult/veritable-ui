import { expect } from '@playwright/test'
import 'reflect-metadata'

import { fetchGet, fetchPost } from '../../helpers/routeHelper.js'
import { checkEmails, extractInvite, extractPin, getHostPort } from './smtpEmails.js'


// TODO update to take company number and URL emails can be issuer@ / holder@
export async function withConnection(invitatorUrl: string, holderUrl: string) {
  const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89ab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/g
  const smtp4devUrl = process.env.VERITABLE_SMTP_ADDRESS || 'http://localhost:5001'

  await fetchPost(`${invitatorUrl}/connection/new/create-invitation`, {
    companyNumber: '04659351',
    email: 'alice@testmail.com',
    action: 'submit',
  })

  // Get pin and invite for the new holder
  const { host, port } = getHostPort(smtp4devUrl)
  if (host === null || port === null) {
    throw new Error(`Unspecified smtp4dev host or port ${smtp4devUrl}`)
  }
  const { inviteEmail, adminEmail } = await checkEmails(host, port)
  const invitatorPin = await extractPin(adminEmail.id, smtp4devUrl)
  if (!invitatorPin) throw new Error(`PIN for ${holderUrl} was not found.`)

  const inviteBase64 = await extractInvite(inviteEmail.id, smtp4devUrl)
  if (!inviteBase64) throw new Error('Invitation for Bob was not found.')

  // Verify and validate a new connection - holder
  const receive = await fetchPost(`${holderUrl}/connection/new/receive-invitation`, {
    invite: inviteBase64,
    action: 'createConnection',
  })
  const [holderConnectionId] = (await receive.text()).match(uuidRegex) || []
  if (!holderConnectionId) throw new Error(`Connection was not found`)

  await fetchPost(`${holderUrl}/connection/${holderConnectionId}/pin-submission`, {
    action: 'submitPinCode',
    pin: invitatorPin,
    stepCount: '3',
  })

  const holderEmail = await checkEmails(host, port).then(({ results }) => results[0])
  expect(holderEmail).not.toEqual(inviteEmail)
  expect(holderEmail).not.toEqual(adminEmail)

  const receiverPin = await extractPin(holderEmail.id, smtp4devUrl)

  const connections = await fetchGet(`${invitatorUrl}/connection?search=OFFSHORE RENEWABLE ENERGY CATAPULT`)
  const [issuerConnectionId] = (await connections.text()).match(uuidRegex) || []
  if (!receiverPin || !issuerConnectionId)
    throw new Error(`PIN ${receiverPin} or Connection ID ${issuerConnectionId} not found`)

  await fetchPost(`${invitatorUrl}/connection/${issuerConnectionId}/pin-submission`, {
    action: 'submitPinCode',
    pin: receiverPin,
    stepCount: '2',
  })
}
