import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { afterEach, beforeEach, describe, it } from 'mocha'
import sinon from 'sinon'
import { CountryCode } from '../../src/models/strings.js'
import { cleanupCloudagent, cleanupDatabase } from '../helpers/cleanup.js'
import { setupTwoPartyContext, TwoPartyContext } from '../helpers/connection.js'
import { alice, socrataCompany } from '../helpers/fixtures.js'
import { cleanupRegistries, insertCompanyHouseRegistry, insertSocrataRegistry } from '../helpers/registries.js'
import { post } from '../helpers/routeHelper.js'
import { delay } from '../helpers/util.js'
const ukRegistryCountryCode = 'GB' as CountryCode
const nyRegistryCountryCode = 'US' as CountryCode

chai.use(chaiAsPromised)
const expect = chai.expect

describe('NewConnectionController', () => {
  const context: TwoPartyContext = {} as TwoPartyContext

  beforeEach(async () => {
    await setupTwoPartyContext(context)

    await cleanupCloudagent([context.localCloudagent, context.remoteCloudagent])
    await cleanupDatabase([context.localDatabase, context.remoteDatabase])
    await insertCompanyHouseRegistry()
    await insertSocrataRegistry()
  })

  afterEach(async () => {
    context.cloudagentEvents.stop()
    await cleanupCloudagent([context.localCloudagent, context.remoteCloudagent])
    await cleanupDatabase([context.localDatabase, context.remoteDatabase])
    await cleanupRegistries()
  })

  describe('create invitation (happy path)', function () {
    let response: Awaited<ReturnType<typeof post>>

    beforeEach(async () => {
      response = await post(context.app, '/connection/new/create-invitation', {
        companyNumber: alice.company_number,
        email: 'alice@testmail.com',
        action: 'submit',
        registryCountryCode: ukRegistryCountryCode,
      })
    })

    it('should return success', async () => {
      expect(response.status).to.equal(200)
    })

    it('should insert new connection into db', async () => {
      const connectionRows = await context.localDatabase.get('connection')
      expect(connectionRows.length).to.equal(1)
      expect(connectionRows[0]).to.deep.contain({
        company_name: alice.company_name,
        company_number: alice.company_number,
        status: 'pending',
      })

      const invites = await context.localDatabase.get('connection_invite', { connection_id: connectionRows[0].id })
      expect(invites.length).to.equal(1)
    })

    it('should allow a second invitation to be submitted', async () => {
      await post(context.app, '/connection/new/create-invitation', {
        companyNumber: alice.company_number,
        email: 'alice@testmail.com',
        action: 'submit',
        registryCountryCode: ukRegistryCountryCode,
      })
      const connectionRows = await context.localDatabase.get('connection')
      expect(connectionRows.length).to.equal(1)
      expect(connectionRows[0]).to.deep.contain({
        company_name: alice.company_name,
        company_number: alice.company_number,
        status: 'pending',
      })

      const invites = await context.localDatabase.get('connection_invite', { connection_id: connectionRows[0].id })
      expect(invites.length).to.equal(2)
    })

    it('should expire the first invitation', async () => {
      await post(context.app, '/connection/new/create-invitation', {
        companyNumber: alice.company_number,
        email: 'alice@testmail.com',
        action: 'submit',
        registryCountryCode: ukRegistryCountryCode,
      })
      const connectionRows = await context.localDatabase.get('connection')
      expect(connectionRows.length).to.equal(1)
      expect(connectionRows[0]).to.deep.contain({
        company_name: alice.company_name,
        company_number: alice.company_number,
        status: 'pending',
      })

      const invites = await context.localDatabase.get('connection_invite', { connection_id: connectionRows[0].id })
      expect(invites.length).to.equal(2)
      expect(invites[0]).to.deep.contain({
        validity: 'expired',
      })
      expect(invites[1]).to.deep.contain({
        validity: 'valid',
      })
    })

    it('should delete the old OOB invitation from the cloudagent', async () => {
      await post(context.app, '/connection/new/create-invitation', {
        companyNumber: alice.company_number,
        email: 'alice@testmail.com',
        action: 'submit',
        registryCountryCode: ukRegistryCountryCode,
      })
      const connectionRows = await context.localDatabase.get('connection')
      expect(connectionRows.length).to.equal(1)
      expect(connectionRows[0]).to.deep.contain({
        company_name: alice.company_name,
        company_number: alice.company_number,
        status: 'pending',
      })

      const invites = await context.localDatabase.get('connection_invite', { connection_id: connectionRows[0].id })
      expect(invites.length).to.equal(2)
      const oobInvitation0 = invites[0].oob_invite_id
      const oobInvitation1 = invites[1].oob_invite_id

      const result1 = await context.localCloudagent.getOutOfBandInvite(oobInvitation1)
      expect(result1).to.deep.contain({ id: oobInvitation1 })

      await expect(context.localCloudagent.getOutOfBandInvite(oobInvitation0)).to.be.rejectedWith(
        `/v1/oob/${oobInvitation0} - not found`
      )
    })
  })

  describe('receive invitation (happy path)', function () {
    let response: Awaited<ReturnType<typeof post>>

    beforeEach(async () => {
      const invite = await context.remoteCloudagent.createOutOfBandInvite({
        companyName: alice.company_name,
        registryCountryCode: ukRegistryCountryCode,
      })
      const inviteContent = Buffer.from(
        JSON.stringify({
          companyNumber: alice.company_number,
          inviteUrl: invite.invitationUrl,
          goalCode: ukRegistryCountryCode,
        }),
        'utf8'
      ).toString('base64url')

      response = await post(context.app, '/connection/new/receive-invitation', {
        invite: inviteContent,
        action: 'createConnection',
      })
    })

    it('should return success', async () => {
      expect(response.status).to.equal(200)
    })

    it('should insert new connection into db', async () => {
      const connectionRows = await context.localDatabase.get('connection')
      expect(connectionRows.length).to.equal(1)
      expect(connectionRows[0]).to.deep.contain({
        company_name: 'DIGITAL CATAPULT',
        company_number: '07964699',
        status: 'pending',
      })

      const invitations = await context.localDatabase.get('connection_invite', { connection_id: connectionRows[0].id })
      expect(invitations.length).to.equal(1)
    })
  })

  describe('connection complete (receive side)', function () {
    beforeEach(async () => {
      const invite = await context.remoteCloudagent.createOutOfBandInvite({
        companyName: alice.company_name,
        registryCountryCode: ukRegistryCountryCode,
      })
      const inviteContent = Buffer.from(
        JSON.stringify({
          companyNumber: alice.company_number,
          inviteUrl: invite.invitationUrl,
          goalCode: ukRegistryCountryCode,
        }),
        'utf8'
      ).toString('base64url')

      await post(context.app, '/connection/new/receive-invitation', {
        invite: inviteContent,
        action: 'createConnection',
      })
    })

    it('should update connection to unverified once connection is established', async () => {
      for (let i = 0; i < 100; i++) {
        const [connection] = await context.localDatabase.get('connection')
        if (connection.status === 'unverified') {
          return
        }
        await delay(10)
      }
      expect.fail('Expected connection to update to state unverified')
    })
  })

  describe('connection complete (send side)', function () {
    it('should update connection to unverified once connection is established', async () => {
      const emailSendStub: sinon.SinonStub = sinon.stub(context.smtpServer, 'sendMail')

      await post(context.app, '/connection/new/create-invitation', {
        companyNumber: alice.company_number,
        email: 'alice@testmail.com',
        action: 'submit',
        registryCountryCode: ukRegistryCountryCode,
      })

      const invite = (emailSendStub.args.find(([name]) => name === 'connection_invite') || [])[1].invite
      const inviteUrl = JSON.parse(Buffer.from(invite, 'base64url').toString('utf8')).inviteUrl

      await context.remoteCloudagent.receiveOutOfBandInvite({
        companyName: alice.company_name,
        invitationUrl: inviteUrl,
      })

      emailSendStub.restore()

      for (let i = 0; i < 100; i++) {
        const [connection] = await context.localDatabase.get('connection')
        if (connection.status === 'unverified') {
          return
        }
        await delay(10)
      }
      expect.fail('Expected connection to update to state unverified')
    })
  })

  describe('create invitation for a NY based company (happy path)', function () {
    let response: Awaited<ReturnType<typeof post>>

    beforeEach(async () => {
      response = await post(context.app, '/connection/new/create-invitation', {
        companyNumber: '3211809',
        email: 'socrata-company@testmail.com',
        action: 'submit',
        registryCountryCode: nyRegistryCountryCode,
      })
    })

    it('should return success', async () => {
      expect(response.status).to.equal(200)
    })

    it('should insert new connection into db', async () => {
      const connectionRows = await context.localDatabase.get('connection')
      expect(connectionRows.length).to.equal(1)
      expect(connectionRows[0]).to.deep.contain({
        company_name: socrataCompany.current_entity_name,
        company_number: socrataCompany.dos_id,
        status: 'pending',
      })

      const invites = await context.localDatabase.get('connection_invite', { connection_id: connectionRows[0].id })
      expect(invites.length).to.equal(1)
    })
  })
  describe('receive invitation for a ny based company (happy path)', function () {
    let response: Awaited<ReturnType<typeof post>>

    beforeEach(async () => {
      const invite = await context.remoteCloudagent.createOutOfBandInvite({
        companyName: socrataCompany.current_entity_name,
        registryCountryCode: nyRegistryCountryCode,
      })
      const inviteContent = Buffer.from(
        JSON.stringify({
          companyNumber: socrataCompany.dos_id,
          inviteUrl: invite.invitationUrl,
          goalCode: nyRegistryCountryCode,
        }),
        'utf8'
      ).toString('base64url')

      response = await post(context.app, '/connection/new/receive-invitation', {
        invite: inviteContent,
        action: 'createConnection',
      })
    })

    it('should return success', async () => {
      expect(response.status).to.equal(200)
    })

    it('should insert new connection into db', async () => {
      const connectionRows = await context.localDatabase.get('connection')
      expect(connectionRows.length).to.equal(1)
      expect(connectionRows[0]).to.deep.contain({
        company_name: socrataCompany.current_entity_name,
        company_number: socrataCompany.dos_id,
        status: 'pending',
      })

      const invitations = await context.localDatabase.get('connection_invite', { connection_id: connectionRows[0].id })
      expect(invitations.length).to.equal(1)
    })
  })
  describe('connection complete for a ny based company (receive side)', function () {
    beforeEach(async () => {
      const invite = await context.remoteCloudagent.createOutOfBandInvite({
        companyName: socrataCompany.current_entity_name,
        registryCountryCode: nyRegistryCountryCode,
      })
      const inviteContent = Buffer.from(
        JSON.stringify({
          companyNumber: socrataCompany.dos_id,
          inviteUrl: invite.invitationUrl,
          goalCode: nyRegistryCountryCode,
        }),
        'utf8'
      ).toString('base64url')

      await post(context.app, '/connection/new/receive-invitation', {
        invite: inviteContent,
        action: 'createConnection',
      })
    })

    it('should update connection to unverified once connection is established', async () => {
      for (let i = 0; i < 100; i++) {
        const [connection] = await context.localDatabase.get('connection')
        if (connection.status === 'unverified') {
          return
        }
        await delay(10)
      }
      expect.fail('Expected connection to update to state unverified')
    })
  })
})
