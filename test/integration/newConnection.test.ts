import { expect } from 'chai'
import express from 'express'
import { describe, it } from 'mocha'
import { container } from 'tsyringe'

import Database from '../../src/models/db/index.js'
import createHttpServer from '../../src/server.js'
import { withBobCloudAgentInvite } from '../helpers/cloudagent.js'
import { withCompanyHouseMock } from '../helpers/companyHouse.js'
import { cleanup } from '../helpers/db.js'
import { validCompanyNumber } from '../helpers/fixtures.js'
import { post } from '../helpers/routeHelper.js'

const db = container.resolve(Database)

describe('NewConnectionController', () => {
  let app: express.Express

  afterEach(async () => {
    await cleanup()
  })
  withCompanyHouseMock()

  describe('create invitation (happy path)', function () {
    let response: Awaited<ReturnType<typeof post>>

    beforeEach(async () => {
      await cleanup()
      app = await createHttpServer()
      response = await post(app, '/connection/new/create-invitation', {
        companyNumber: validCompanyNumber,
        email: 'alice@example.com',
        action: 'submit',
      })
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
      app = await createHttpServer()
      response = await post(app, '/connection/new/receive-invitation', {
        invite: context.invite,
        action: 'createConnection',
      })
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
})
