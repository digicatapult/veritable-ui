import 'reflect-metadata'
import { fetchGet, fetchPost } from '../../helpers/routeHelper.js'
import { checkEmails, extractInvite, extractPin, getHostPort } from './smtpEmails.js'

export async function withVerifiedConnection(issuerHost, holderHost) {
  const smtp4devUrl = process.env.VERITABLE_SMTP_ADDRESS || 'http://localhost:5001'

  await fetchPost(`${issuerHost}/connection/new/create-invitation`, {
    companyNumber: '04659351',
    email: 'alice@testmail.com',
    action: 'submit',
  })

  // Get pin and invite
  const { host, port } = getHostPort(smtp4devUrl)
  if (host === null || port === null) {
    throw new Error(`Unspecified smtp4dev host or port ${smtp4devUrl}`)
  }
  const { inviteEmail, adminEmail } = await checkEmails(host, port)
  const issuerPin = await extractPin(adminEmail.id, smtp4devUrl)
  if (!issuerPin) throw new Error(`PIN for ${holderHost} was not found.`)
  if (issuerPin.length !== 6) {
    throw new Error('Pin does not have the expected length.')
  }

  const invite = await extractInvite(inviteEmail.id, smtp4devUrl)
  if (!invite) throw new Error('Invitation for Bob was not found.')

  // Use invite and from Bob's side
  const b = await fetchPost(`${holderHost}/connection/new/receive-invitation`, {
    invite: invite,
    action: 'createConnection',
  })

  const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89ab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/g
  const [holderConnectionId] = (await b.text()).match(uuidRegex) || []

  await fetchPost(`${holderHost}/connection/${holderConnectionId}/pin-submission`, {
    action: 'submitPinCode',
    pin: issuerPin,
    stepCount: '3',
  })

  const responseEmail = await checkEmails(host, port).then(({ results }) => results[0])
  const holderPin = await extractPin(responseEmail.id, smtp4devUrl)

  const issuerConnections = await fetchGet(`${issuerHost}/connection?search=OFFSHORE RENEWABLE ENERGY CATAPULT`)
  const [issuerConnectionId] = (await issuerConnections.text()).match(uuidRegex) || []

  if (!holderPin) throw new Error(`PIN for ${issuerHost} was not found.`)

  await fetchPost(`${issuerHost}/connection/${issuerConnectionId}/pin-submission`, {
    action: 'submitPinCode',
    pin: holderPin,
    stepCount: '2',
  })
}

export async function withConnection(smtp4devUrl: string, aliceUrl: string, bobUrl: string) {
  // Send an invite from Alice to Bob
  await fetchPost(`${aliceUrl}/connection/new/create-invitation`, {
    companyNumber: '04659351',
    email: 'alice@testmail.com',
    action: 'submit',
  })

  // Get pin and invite
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

  const invite = await extractInvite(inviteEmail.id, smtp4devUrl)
  if (!invite) throw new Error('Invitation for Bob was not found.')

  // Use invite and from Bob's side
  await fetchPost(`${bobUrl}/connection/new/receive-invitation`, {
    invite: invite,
    action: 'createConnection',
  })
}
