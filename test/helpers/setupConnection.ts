import 'reflect-metadata'

import { RegistryType } from '../../src/models/db/types.js'
import { CountryCode } from '../../src/models/stringTypes.js'
import { alice, bob, nyStateCompany, openCorporatesCompany } from './fixtures.js'
import { fetchGet, fetchPost } from './routeHelper.js'
import { checkEmails, clearSmtp4devMessages, extractInvite, extractPin } from './smtpEmails.js'
import { delay } from './util.js'

export interface E2ETestCompany {
  companyName: string
  companyNumber: string
  address: string
  registryCountryCode: CountryCode
  selectedRegistry: RegistryType
  url: string
}

export const aliceE2E: E2ETestCompany = {
  companyName: alice.company_name,
  companyNumber: alice.company_number,
  address: alice.registered_office_address.address_line_1,
  registryCountryCode: 'GB',
  selectedRegistry: 'company_house',
  url: process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000',
}

export const bobE2E: E2ETestCompany = {
  companyName: bob.company_name,
  companyNumber: bob.company_number,
  address: bob.registered_office_address.address_line_1,
  registryCountryCode: 'GB',
  selectedRegistry: 'company_house',
  url: process.env.VERITABLE_BOB_PUBLIC_URL || 'http://localhost:3001',
}

export const charlieE2E: E2ETestCompany = {
  companyName: nyStateCompany.current_entity_name,
  companyNumber: nyStateCompany.dos_id,
  address: nyStateCompany.dos_process_address_1,
  registryCountryCode: 'US',
  selectedRegistry: 'ny_state',
  url: process.env.VERITABLE_CHARLIE_PUBLIC_URL || 'http://localhost:3002',
}

export const daveE2E: E2ETestCompany = {
  companyName: openCorporatesCompany.name,
  companyNumber: openCorporatesCompany.company_number,
  address: openCorporatesCompany.registered_address_in_full,
  registryCountryCode: 'GB',
  selectedRegistry: 'open_corporates',
  url: process.env.VERITABLE_DAVE_PUBLIC_URL || 'http://localhost:3003',
}

export async function withConnection(inviter: E2ETestCompany, receiver: E2ETestCompany) {
  const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89ab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/g

  // Ensure a clean state for SMTP4Dev before starting the test.
  // This prevents leftover emails from previous tests from interfering with email checks.
  await clearSmtp4devMessages()
  await delay(100)

  // Create the invitation
  await fetchPost(`${inviter.url}/connection/new/create-invitation`, {
    companyNumber: receiver.companyNumber,
    email: 'receiver@testmail.com',
    action: 'submit',
    registryCountryCode: receiver.registryCountryCode,
    selectedRegistry: receiver.selectedRegistry,
  })

  await delay(100)

  // Get pin and invite for the counterparty
  const adminEmail = await checkEmails('admin@veritable.com')
  const inviterPin = await extractPin(adminEmail.id)
  if (!inviterPin) throw new Error(`PIN for ${receiver.url} was not found.`)

  const inviteEmail = await checkEmails('receiver@testmail.com')
  const inviteBase64 = await extractInvite(inviteEmail.id)
  if (!inviteBase64) throw new Error(`Invitation for ${receiver.url} was not found`)

  await clearSmtp4devMessages()

  // Counterparty receives the invitation
  await fetchPost(`${receiver.url}/connection/new/receive-invitation`, {
    invite: inviteBase64,
    action: 'createConnection',
  })

  // Confirm the local connection record has been created
  let inviterConnectionIdAtReceiver: string | undefined

  for (let attempt = 1; attempt <= 100; attempt++) {
    await delay(100)
    const res = await fetchGet(`${receiver.url}/connection?search=${inviter.companyName}`)
    const text = await res.text()
    inviterConnectionIdAtReceiver = text.match(uuidRegex)?.[0]
    if (inviterConnectionIdAtReceiver) {
      break
    }
    if (attempt === 100) {
      throw new Error(`No connection ID after 100 retries at ${receiver.url}`)
    }
  }

  // Submit the pin code at the receiver
  await fetchPost(`${receiver.url}/connection/${inviterConnectionIdAtReceiver}/pin-submission`, {
    action: 'submitPinCode',
    pin: inviterPin,
    stepCount: '2',
  })

  // Get the responding pin code from the counterparty to the original inviter
  const receiverEmail = await checkEmails('admin@veritable.com')
  const receiverPin = await extractPin(receiverEmail.id)
  if (!receiverPin) throw new Error(`PIN for ${inviter.url} was not found.`)

  await clearSmtp4devMessages()

  // Get the connection id for the counterparty at the original inviter
  const connections = await fetchGet(`${inviter.url}/connection?search=${encodeURIComponent(receiver.companyName)}`)
  const [receiverConnectionIdAtInviter] = (await connections.text()).match(uuidRegex) || []
  if (!receiverConnectionIdAtInviter) throw new Error(`No connection ID at ${inviter.url}`)

  // Original inviter submits the pin code for the counterparty
  await fetchPost(`${inviter.url}/connection/${receiverConnectionIdAtInviter}/pin-submission`, {
    action: 'submitPinCode',
    pin: receiverPin,
    stepCount: '2',
  })

  // Confirm the connection is successful at the original inviter
  for (let attempt = 1; attempt <= 100; attempt++) {
    await delay(100)
    const res = await fetchGet(`${inviter.url}/connection?search=${encodeURIComponent(receiver.companyName)}`)
    const text = await res.text()
    if (/data-status="success"/.test(text)) {
      return
    }
    if (attempt === 100) {
      throw new Error(`Connection unsuccessful after 100 retries: ${inviter.url}`)
    }
  }
}
