import { expect } from 'chai'
import express from 'express'
import knex from 'knex'
import { afterEach, beforeEach, describe, it } from 'mocha'
import { container } from 'tsyringe'

import sinon from 'sinon'
import Database from '../../src/models/db/index.js'
import EmailService from '../../src/models/emailService/index.js'
import VeritableCloudagent from '../../src/models/veritableCloudagent/index.js'
import createHttpServer from '../../src/server.js'
import VeritableCloudagentEvents from '../../src/services/veritableCloudagentEvents.js'
import { cleanupCloudagent, withAliceReceivesBobsInvite } from '../helpers/cloudagent.js'
import { cleanupDatabase } from '../helpers/db.js'
import { alice, bobDbConfig, mockEnvBob } from '../helpers/fixtures.js'
import { mockLogger } from '../helpers/logger.js'
import { post } from '../helpers/routeHelper.js'
import { delay } from '../helpers/util.js'

describe.only('NewConnectionController', () => {
  type Context = {
    app: express.Express
    cloudagentEvents: VeritableCloudagentEvents
    remoteDatabase: Database
    localDatabase: Database
    remoteCloudagent: VeritableCloudagent
    localCloudagent: VeritableCloudagent
  }
  const context: Context = {} as Context

  beforeEach(async () => {
    context.localCloudagent = container.resolve(VeritableCloudagent)
    context.localDatabase = container.resolve(Database)
    context.remoteCloudagent = new VeritableCloudagent(mockEnvBob, mockLogger)
    context.remoteDatabase = new Database(knex(bobDbConfig))
    const server = await createHttpServer(true)
    Object.assign(context, {
      ...server,
    })
    await cleanupDatabase()
    await cleanupCloudagent()
  })

  afterEach(async () => {
    await cleanupDatabase()
    await cleanupCloudagent()
    context.cloudagentEvents.stop()
  })

  describe('create invitation (happy path)', function () {
    let response: Awaited<ReturnType<typeof post>>
    beforeEach(async () => {
      response = await post(context.app, '/connection/new/create-invitation', {
        companyNumber: alice.company_number,
        email: 'alice@example.com',
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
      response = await withAliceReceivesBobsInvite(context)
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
    it('should update connection to unverified once connection is established', async () => {
      await withAliceReceivesBobsInvite(context)

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
    const smtpServer = container.resolve(EmailService)

    afterEach(async () => {
      emailSendStub.restore()
    })

    it('should update connection to unverified once connection is established', async () => {
      emailSendStub = sinon.stub(smtpServer, 'sendMail')

      await post(context.app, '/connection/new/create-invitation', {
        companyNumber: alice.company_number,
        email: 'alice@example.com',
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
