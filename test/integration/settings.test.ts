import { expect } from 'chai'
import express from 'express'
import { container } from 'tsyringe'
import Database from '../../src/models/db/index.js'
import createHttpServer from '../../src/server.js'
import VeritableCloudagentEvents from '../../src/services/veritableCloudagentEvents.js'
import { cleanup } from '../helpers/db.js'
import { get, post } from '../helpers/routeHelper.js'

describe.only('integration tests for settings page', function () {
  const db = container.resolve(Database)
  let server: { app: express.Express; cloudagentEvents: VeritableCloudagentEvents }

  const testBody = {
    company_name: 'Test Company Name',
    companies_house_number: '0000000',
    from_email: 'mail@testmail.com',
    postal_address: 'Some Address, Somewhere',
    admin_email: 'admin@testmail.com',
  }
  const testEditBody = {
    company_name: 'Test Company Name',
    companies_house_number: '0000000',
    from_email: 'mail@testmail.com',
    postal_address: 'Some Address, Somewhere',
    admin_email: 'admin@testmail.com',
    action: 'updateSettings',
  }

  afterEach(async () => {
    await cleanup()
  })

  describe('happy path', function () {
    beforeEach(async () => {
      await cleanup()
      server = await createHttpServer()
    })

    afterEach(async () => {
      server.cloudagentEvents.stop()
    })
    it('returns success', async function () {
      const response = await get(server.app, '/settings', {})
      expect(response.status).to.equal(200)
      expect(response.text.length).to.be.greaterThan(0)
    })
    it('returns success on edit mode', async function () {
      const response = await post(server.app, '/settings/update?edit=true', testEditBody)
      expect(response.status).to.equal(200)
      expect(response.text.length).to.be.greaterThan(0)
    })
    it('returns fail on edit mode', async function () {
      const response = await post(server.app, '/settings/update?edit=false', testEditBody)
      expect(response.status).to.equal(501)
    })
    it('returns fail on missing property', async function () {
      const response = await post(server.app, '/settings/update?edit=false', testBody)
      expect(response.status).to.equal(501)
    })
  })
})
