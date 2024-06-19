import { expect } from 'chai'
import express from 'express'
import { afterEach, beforeEach, describe, it } from 'mocha'
import { container } from 'tsyringe'

import Database from '../../src/models/db/index.js'
import createHttpServer from '../../src/server.js'
import VeritableCloudagentEvents from '../../src/services/veritableCloudagentEvents.js'
import { cleanupCloudagent, withBobCloudAgentInvite } from '../helpers/cloudagent.js'
import { withCompanyHouseMock } from '../helpers/companyHouse.js'
import { cleanup } from '../helpers/db.js'
import { validCompanyNumber } from '../helpers/fixtures.js'
import { post } from '../helpers/routeHelper.js'
import { delay } from '../helpers/util.js'

const db = container.resolve(Database)

describe('NewConnectionController', () => {
  let server: { app: express.Express; cloudagentEvents: VeritableCloudagentEvents }

  afterEach(async () => {
    await cleanup()
  })
  withCompanyHouseMock()

  describe('create invitation (happy path)', function () {
    let response: Awaited<ReturnType<typeof post>>

    beforeEach(async () => {
      await cleanup()
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
      await cleanup()
      await cleanupCloudagent()
      server = await createHttpServer()
      response = await post(server.app, '/connection/new/receive-invitation', {
        invite: context.invite,
        action: 'createConnection',
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
      })

      const invites = await db.get('connection_invite', { connection_id: connectionRows[0].id })
      expect(invites.length).to.equal(1)
    })

    it('should update connection to unverified once connection is established', async () => {
      for (let i = 0; i < 10; i++) {
        const [connection] = await db.get('connection')
        if (connection.status === 'unverified') {
          return
        }
        await delay(100)
      }
      expect.fail('Expected connection to update to state unverified')
    })
  })
})
