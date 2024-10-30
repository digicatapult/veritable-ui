import 'reflect-metadata'
import { fetchPost } from '../../helpers/routeHelper.js'
import { checkEmails, extractInvite, extractPin, getHostPort } from './smtpEmails.js'

export async function withConnection() {
  // Send an invite from Alice to Bob
  await fetchPost(`http://localhost:3000/connection/new/create-invitation`, {
    companyNumber: '04659351',
    email: 'alice@testmail.com',
    action: 'submit',
  })

  // Get pin and invite
  const smtp4devUrl = process.env.VERITABLE_SMTP_ADDRESS || 'http://localhost:5001'
  const { host, port } = getHostPort(smtp4devUrl)
  if (host === null || port === null) {
    throw new Error(`Unspecified smtp4dev host or port ${smtp4devUrl}`)
  }
  const { inviteEmail, adminEmail } = await checkEmails(host, port)
  const extractedPin = await extractPin(adminEmail.id, smtp4devUrl)
  if (!extractedPin) throw new Error('PIN for Bob was not found.')
  if (extractedPin.length !== 6) {
    throw new Error('Pin does not have the expected length.')
  }
  const pinForBob = extractedPin
  const invite = await extractInvite(inviteEmail.id, smtp4devUrl)
  if (!invite) throw new Error('Invitation for Bob was not found.')

  // Use invite and from Bob's side
  await fetchPost('http://localhost:3001/connection/new/receive-invitation', {
    invite: invite,
    action: 'createConnection',
  })

  // Do we want to verify this connection?
}
