import { expect } from 'chai'
import express from 'express'
import { container } from 'tsyringe'
import Database from '../../src/models/db/index.js'
import VeritableCloudagent from '../../src/models/veritableCloudagent/index.js'
import createHttpServer from '../../src/server.js'
import VeritableCloudagentEvents from '../../src/services/veritableCloudagentEvents.js'
import { withCompanyHouseMock } from '../helpers/companyHouse.js'
import { cleanup } from '../helpers/db.js'
import { get, post } from '../helpers/routeHelper.js'
import { withAdminEmail } from '../helpers/settings.js'

describe('integration tests for settings page', function () {
  const db = container.resolve(Database)
  type Context = {
    app: express.Express
    cloudagentEvents: VeritableCloudagentEvents
    remoteDatabase: Database
    remoteCloudagent: VeritableCloudagent
    remoteConnectionId: string
    localConnectionId: string
    response: Awaited<ReturnType<typeof post>>
  }
  const context: Context = {} as Context
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
    admin_email: 'madmin@testmail.com',
    action: 'updateSettings',
  }
  withCompanyHouseMock()
  beforeEach(async () => {
    await cleanup()
    await withAdminEmail(db)
    const server = await createHttpServer()
    Object.assign(context, {
      ...server,
    })
  })

  afterEach(async () => {
    context.cloudagentEvents.stop()
    await cleanup()
  })

  describe('happy path', function () {
    it('returns success', async function () {
      const response = await get(context.app, '/settings', {})
      expect(response.status).to.equal(200)
      expect(response.text.length).to.be.greaterThan(0)
    })
    it('returns success in edit mode and updates the db ', async function () {
      const setting = await db.get('settings')
      expect(setting.length).to.equal(1)
      expect(setting[0].setting_value).to.contain('admin@testmail.com')
      const response = await post(context.app, '/settings/?edit=true', testEditBody)
      const setting1 = await db.get('settings')
      expect(setting1.length).to.equal(1)
      expect(setting1[0].setting_value).to.contain('madmin@testmail.com')
      expect(response.status).to.equal(200)
      expect(response.text.length).to.be.greaterThan(0)
    })
  })

  describe('sad path', function () {
    it('returns fail on edit mode being false', async function () {
      const response = await post(context.app, '/settings/?edit=false', testEditBody)
      expect(response.status).to.equal(501)
    })
    it('returns fail on missing property and false edit mode', async function () {
      const response = await post(context.app, '/settings/?edit=false', testBody)
      expect(response.status).to.equal(501)
    })
    it('returns fail on missing property even if edit is turned on', async function () {
      const response = await post(context.app, '/settings/?edit=true', testBody)
      expect(response.status).to.equal(501)
    })
  })
})
