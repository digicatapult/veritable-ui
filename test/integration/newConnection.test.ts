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
import { alice } from '../helpers/fixtures.js'
import { post } from '../helpers/routeHelper.js'
import { delay } from '../helpers/util.js'

type Context = {
  app: express.Express
  cloudagentEvents: VeritableCloudagentEvents
  db: Database
  invite: string
  inviteUrl: string
  response: Awaited<ReturnType<typeof post>>
}

describe.only('NewConnectionController', () => {
  afterEach(async () => {
    await cleanupDatabase()
  })

  describe('create invitation (happy path)', function () {
    const context: Context = {
      db: container.resolve(Database),
      invite: '',
    } as unknown as Context

    // let response: Awaited<ReturnType<typeof post>>

    beforeEach(async () => {
      await cleanupDatabase()
      await cleanupCloudagent()
      const server = await createHttpServer()
      Object.assign(context, {
        ...server,
      })

      context.response = await post(context.app, '/connection/new/create-invitation', {
        companyNumber: alice.company_number,
        email: 'alice@example.com',
        action: 'submit',
      })
    })

    afterEach(async () => {
      await cleanupCloudagent()
      context.cloudagentEvents.stop()
    })

    it('should return success', async () => {
      expect(context.response.status).to.equal(200)
    })

    it('should insert new connection into db', async () => {
      const connectionRows = await context.db.get('connection')
      expect(connectionRows.length).to.equal(1)
      expect(connectionRows[0]).to.deep.contain({
        company_name: 'DIGITAL CATAPULT',
        company_number: '07964699',
        status: 'pending',
      })

      const invites = await context.db.get('connection_invite', { connection_id: connectionRows[0].id })
      expect(invites.length).to.equal(1)
    })
  })

  describe('receive invitation (happy path)', function () {
    // let response: Awaited<ReturnType<typeof post>>
    const context: Context = {
      db: container.resolve(Database),
      invite: '',
    } as unknown as Context

    beforeEach(async () => {
      await cleanupDatabase()
      await cleanupCloudagent()
      const server = await createHttpServer()
      Object.assign(context, {
        ...server,
      })
      context.response = await post(context.app, '/connection/new/receive-invitation', {
        invite: context.invite,
        action: 'createConnection',
      })
    })

    withBobCloudAgentInvite(context)

    afterEach(async () => {
      await cleanupCloudagent()
      context.cloudagentEvents.stop()
    })

    it('should return success', async () => {
      expect(context.response.status).to.equal(200)
    })

    it('should insert new connection into db', async () => {
      const connectionRows = await context.db.get('connection')
      expect(connectionRows.length).to.equal(1)
      expect(connectionRows[0]).to.deep.contain({
        company_name: 'DIGITAL CATAPULT',
        company_number: '07964699',
        status: 'pending',
      })

      const invites = await context.db.get('connection_invite', { connection_id: connectionRows[0].id })
      expect(invites.length).to.equal(1)
    })
  })

  describe('connection complete (receive side)', function () {
    const context: Context = {
      db: container.resolve(Database),
      invite: '',
    } as unknown as Context

    withBobCloudAgentInvite(context)

    beforeEach(async () => {
      await cleanupDatabase()
      await cleanupCloudagent()
      const server = await createHttpServer()
      Object.assign(context, {
        ...server,
      })
      await post(context.app, '/connection/new/receive-invitation', {
        invite: context.invite,
        action: 'createConnection',
      })
    })

    afterEach(async () => {
      await cleanupCloudagent()
      context.cloudagentEvents.stop()
    })

    it('should update connection to unverified once connection is established', async () => {
      for (let i = 0; i < 100; i++) {
        const [connection] = await context.db.get('connection')
        if (connection.status === 'unverified') {
          return
        }
        await delay(10)
      }
      expect.fail('Expected connection to update to state unverified')
    })
  })

  describe('connection complete (send side)', function () {
    const context: Context = {
      db: container.resolve(Database),
      inviteUrl: '',
    } as unknown as Context

    let emailSendStub: sinon.SinonStub

    beforeEach(async () => {
      await cleanupDatabase()
      await cleanupCloudagent()
      const server = await createHttpServer()
      Object.assign(context, {
        ...server,
      })

      const email = container.resolve(EmailService)
      emailSendStub = sinon.stub(email, 'sendMail')
      await post(server.app, '/connection/new/create-invitation', {
        companyNumber: alice.company_number,
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
      context.cloudagentEvents.stop()
    })

    it('should update connection to unverified once connection is established', async () => {
      for (let i = 0; i < 100; i++) {
        const [connection] = await context.db.get('connection')
        if (connection.status === 'unverified') {
          return
        }
        await delay(10)
      }
      expect.fail('Expected connection to update to state unverified')
    })
  })
})
