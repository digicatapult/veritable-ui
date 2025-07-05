import { expect } from 'chai'
import { afterEach, beforeEach, describe, it } from 'mocha'
import sinon from 'sinon'
import { cleanupCloudagent, cleanupDatabase } from '../helpers/cleanup.js'
import { setupTwoPartyContext, TwoPartyContext } from '../helpers/connection.js'
import { alice } from '../helpers/fixtures.js'
import { post } from '../helpers/routeHelper.js'
import { delay } from '../helpers/util.js'

describe('NewConnectionController', () => {
  const context: TwoPartyContext = {} as TwoPartyContext

  beforeEach(async () => {
    await setupTwoPartyContext(context)

    await cleanupCloudagent([context.localCloudagent, context.remoteCloudagent])
    await cleanupDatabase([context.localDatabase, context.remoteDatabase])
  })

  afterEach(async () => {
    context.cloudagentEvents.stop()
    await cleanupCloudagent([context.localCloudagent, context.remoteCloudagent])
    await cleanupDatabase([context.localDatabase, context.remoteDatabase])
  })

  describe('create invitation (happy path)', function () {
    let response: Awaited<ReturnType<typeof post>>

    beforeEach(async () => {
      response = await post(context.app, '/connection/new/create-invitation', {
        companyNumber: alice.company_number,
        email: 'alice@testmail.com',
        action: 'submit',
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
  })

  describe('receive invitation (happy path)', function () {
    let response: Awaited<ReturnType<typeof post>>

    beforeEach(async () => {
      const invite = await context.remoteCloudagent.createOutOfBandInvite({ companyName: alice.company_name })
      const inviteContent = Buffer.from(
        JSON.stringify({
          companyNumber: alice.company_number,
          inviteUrl: invite.invitationUrl,
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
      const invite = await context.remoteCloudagent.createOutOfBandInvite({ companyName: alice.company_name })
      const inviteContent = Buffer.from(
        JSON.stringify({
          companyNumber: alice.company_number,
          inviteUrl: invite.invitationUrl,
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
        await delay(100)
        const [connection] = await context.localDatabase.get('connection')
        if (connection.status === 'unverified') {
          return
        }
      }
      expect.fail('Expected connection to update to state unverified')
    })
  })

  describe('connection complete (send side)', function () {
    let emailSendStub: sinon.SinonStub

    afterEach(async () => {
      emailSendStub.restore()
    })

    it('should update connection to unverified once connection is established', async () => {
      emailSendStub = sinon.stub(context.smtpServer, 'sendMail')

      await post(context.app, '/connection/new/create-invitation', {
        companyNumber: alice.company_number,
        email: 'alice@testmail.com',
        action: 'submit',
      })

      const invite = (emailSendStub.args.find(([name]) => name === 'connection_invite') || [])[1].invite
      const inviteUrl = JSON.parse(Buffer.from(invite, 'base64url').toString('utf8')).inviteUrl

      await context.remoteCloudagent.receiveOutOfBandInvite({
        companyName: alice.company_name,
        invitationUrl: inviteUrl,
      })

      for (let i = 0; i < 100; i++) {
        await delay(100)
        const [connection] = await context.localDatabase.get('connection')
        if (connection.status === 'unverified') {
          return
        }
      }
      expect.fail('Expected connection to update to state unverified')
    })
  })
})
