import { expect } from 'chai'
import type express from 'express'
import { afterEach, beforeEach, describe } from 'mocha'

import Database from '../../src/models/db/index.js'
import VeritableCloudagent from '../../src/models/veritableCloudagent.js'
import { cleanupCloudagent } from '../helpers/cloudagent.js'
import { withCompanyHouseMock } from '../helpers/companyHouse.js'
import { cleanup } from '../helpers/db.js'

import { container } from 'tsyringe'
import createHttpServer from '../../src/server.js'
import VeritableCloudagentEvents from '../../src/services/veritableCloudagentEvents.js'
import { withBobCharlie_verified } from '../helpers/connection.js'
import { fetchPost, post } from '../helpers/routeHelper.js'

describe.only('partial query aggregation', function () {
  this.timeout(30000)
  const db = container.resolve(Database)
  afterEach(async () => {
    await cleanup()
  })
  withCompanyHouseMock()

  describe('when alice creates a query and bob forwards to charlie', function () {
    type Context = {
      app: express.Express
      cloudAgent: VeritableCloudagent
      bobAgent: VeritableCloudagent
      charlieAgent: VeritableCloudagent
      cloudagentEvents: VeritableCloudagentEvents
      bobDb: Database
      bobConnectionId: string
      charlieDb: Database
      charlieConnectionId: string
      aliceConnectionId: string
      response: Awaited<ReturnType<typeof post>>
    }
    const context: Context = {} as Context

    beforeEach(async function () {
      await cleanup()
      await cleanupCloudagent()
      const server = await createHttpServer(true)
      Object.assign(context, {
        ...server,
      })
    })

    afterEach(async function () {
      context.cloudagentEvents.stop()
    })

    withBobCharlie_verified(context)

    beforeEach(async function () {
      context.response = await post(context.app, `/queries/new/scope-3-carbon-consumption/stage`, {
        connectionId: context.aliceConnectionId,
        productId: 'product-id-001',
        quantity: 1,
        action: 'success',
      })

      const queryId = await db.get('query').then((res) => res[0].id)
      await fetchPost(`http://localhost:3001/queries/scope-3-carbon-consumption/${queryId}/response`, {
        companyId: context.bobConnectionId,
        action: 'success',
        emissions: '100',
        partialQuery: ['on'],
        partialSelect: ['on'],
        connectionIds: [context.charlieConnectionId],
        productIds: ['some-charlies-product'],
        quantities: ['10'],
      })
    })

    it('should response 200', async function () {
      expect(context.response.statusCode).to.equal(200)
    })

    it('mark alice (parent) query as forwarded from Bobs perpective', async function () {
      const [forwardedQuery] = await context.bobDb.get('query')

      expect(forwardedQuery).to.deep.equal({})
    })
  })
})
