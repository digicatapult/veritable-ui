import { expect } from 'chai'
import express from 'express'
import { afterEach, beforeEach, describe, it } from 'mocha'
import { container } from 'tsyringe'

import sinon from 'sinon'
import Database from '../../src/models/db/index.js'
import EmailService from '../../src/models/emailService/index.js'
import createHttpServer from '../../src/server.js'
import VeritableCloudagentEvents from '../../src/services/veritableCloudagentEvents.js'
import { cleanupCloudagent, withBobCloudAgentInvite, withBobCloudagentAcceptInvite } from '../helpers/cloudagent.js'
import { cleanupDatabase } from '../helpers/db.js'
import { validCompanyNumber } from '../helpers/fixtures.js'
import { post } from '../helpers/routeHelper.js'
import { delay } from '../helpers/util.js'

const db = container.resolve(Database)

describe('NewConnectionController', () => {
  let server: { app: express.Express; cloudagentEvents: VeritableCloudagentEvents }

  afterEach(async () => {
    await cleanupDatabase()
  })

  describe('create invitation (happy path)', function () {
    let response: Awaited<ReturnType<typeof post>>
    beforeEach(async () => {
      await cleanupDatabase()
      await cleanupCloudagent()
      server = await createHttpServer()
      response = await post(server.app, '/connection/new/create-invitation', {
        companyNumber: validCompanyNumber,
        email: 'alice@example.com',
        action: 'submit',
      })
    })

    afterEach(async () => {
      await cleanupCloudagent()
      server.cloudagentEvents.stop()
    })

    it('should return success', async () => {
      expect(response.status).to.equal(200)
    })

    it('should insert new connection into db', async () => {
      const connectionRows = await db.get('connection')
      expect(connectionRows.length).to.equal(1)
      expect(connectionRows[0]).to.deep.contain({
        company_name: 'DIGITAL CATAPULT',
        company_number: '07964699',
        status: 'pending',
      })

      const invites = await db.get('connection_invite', { connection_id: connectionRows[0].id })
      expect(invites.length).to.equal(1)
    })
  })

  describe('receive invitation (happy path)', function () {
    let response: Awaited<ReturnType<typeof post>>
    const context: { invite: string } = { invite: '' }

    withBobCloudAgentInvite(context)

    beforeEach(async () => {
      await cleanupDatabase()
      await cleanupCloudagent()
      server = await createHttpServer(false)
      response = await post(server.app, '/connection/new/receive-invitation', {
        invite: context.invite,
        action: 'createConnection',
      })
    })

    afterEach(async () => {
      await cleanupCloudagent()
    })

    it('should return success', async () => {
      expect(response.status).to.equal(200)
    })

    it('should insert new connection into db', async () => {
      const connectionRows = await db.get('connection')
      expect(connectionRows.length).to.equal(1)
      expect(connectionRows[0]).to.deep.contain({
        company_name: 'DIGITAL CATAPULT',
        company_number: '07964699',
        status: 'pending',
      })

      const invites = await db.get('connection_invite', { connection_id: connectionRows[0].id })
      expect(invites.length).to.equal(1)
    })
  })

  describe('connection complete (receive side)', function () {
    const context: { invite: string } = { invite: '' }

    withBobCloudAgentInvite(context)

    beforeEach(async () => {
      await cleanupDatabase()
      await cleanupCloudagent()
      server = await createHttpServer(true)
      await post(server.app, '/connection/new/receive-invitation', {
        invite: context.invite,
        action: 'createConnection',
      })
    })

    afterEach(async () => {
      await cleanupCloudagent()
      server.cloudagentEvents.stop()
    })

    it('should update connection to unverified once connection is established', async () => {
      for (let i = 0; i < 100; i++) {
        const [connection] = await db.get('connection')
        if (connection.status === 'unverified') {
          return
        }
        await delay(10)
      }
      expect.fail('Expected connection to update to state unverified')
    })
  })

  describe('connection complete (send side)', function () {
    const context: { inviteUrl: string } = { inviteUrl: '' }
    let emailSendStub: sinon.SinonStub

    beforeEach(async () => {
      await cleanupDatabase()
      await cleanupCloudagent()
      server = await createHttpServer(true)

      const email = container.resolve(EmailService)
      emailSendStub = sinon.stub(email, 'sendMail')
      await post(server.app, '/connection/new/create-invitation', {
        companyNumber: validCompanyNumber,
        email: 'alice@example.com',
        action: 'submit',
      })
      const invite = (emailSendStub.args.find(([name]) => name === 'connection_invite') || [])[1].invite
      context.inviteUrl = JSON.parse(Buffer.from(invite, 'base64url').toString('utf8')).inviteUrl
    })

    withBobCloudagentAcceptInvite(context)

    afterEach(async () => {
      if (emailSendStub) {
        emailSendStub.restore()
      }

      await cleanupCloudagent()
      server.cloudagentEvents.stop()
    })

    it('should update connection to unverified once connection is established', async () => {
      for (let i = 0; i < 100; i++) {
        const [connection] = await db.get('connection')
        if (connection.status === 'unverified') {
          return
        }
        await delay(10)
      }
      expect.fail('Expected connection to update to state unverified')
    })
  })
})
