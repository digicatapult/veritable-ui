import { expect } from '@playwright/test'
import 'reflect-metadata'

import { fetchGet, fetchPost } from '../../helpers/routeHelper.js'
import { checkEmails, extractInvite, extractPin, getHostPort } from './smtpEmails.js'

const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89ab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/g

export async function withConnection(issuerUrl, holderUrl) {
  const smtp4devUrl = process.env.VERITABLE_SMTP_ADDRESS || 'http://localhost:5001'

  await fetchPost(`${issuerUrl}/connection/new/create-invitation`, {
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
  const issuerPin = await extractPin(adminEmail.id, smtp4devUrl)
  if (!issuerPin) throw new Error(`PIN for ${holderUrl} was not found.`)

  const inviteBase64 = await extractInvite(inviteEmail.id, smtp4devUrl)
  if (!inviteBase64) throw new Error('Invitation for Bob was not found.')

  // Verify and validate a new connection - holder
  const receive = await fetchPost(`${holderUrl}/connection/new/receive-invitation`, {
    invite: inviteBase64,
    action: 'createConnection',
  })
  const [holderConnectionId] = (await receive.text()).match(uuidRegex) || []
  await fetchPost(`${holderUrl}/connection/${holderConnectionId}/pin-submission`, {
    action: 'submitPinCode',
    pin: issuerPin,
    stepCount: '3',
  })

  const holderEmail = await checkEmails(host, port).then(({ results }) => results[0])
  expect(holderEmail).not.toEqual(inviteEmail)
  expect(holderEmail).not.toEqual(adminEmail)

  const holderPin = await extractPin(holderEmail.id, smtp4devUrl)

  const connections = await fetchGet(`${issuerUrl}/connection?search=OFFSHORE RENEWABLE ENERGY CATAPULT`)
  const [issuerConnectionId] = (await connections.text()).match(uuidRegex) || []
  if (!holderPin)
    throw new Error(`PIN ${holderPin} or Connection ID ${issuerConnectionId} not found`)

  await fetchPost(`${issuerUrl}/connection/${issuerConnectionId}/pin-submission`, {
    action: 'submitPinCode',
    pin: holderPin,
    stepCount: '2',
  })
}
