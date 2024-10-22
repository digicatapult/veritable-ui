import { expect } from 'chai'
import type express from 'express'
import { afterEach, beforeEach, describe } from 'mocha'

import Database from '../../src/models/db/index.js'
import VeritableCloudagent from '../../src/models/veritableCloudagent.js'
import { cleanupCloudagent } from '../helpers/cloudagent.js'
import { withCompanyHouseMock } from '../helpers/companyHouse.js'
import { cleanup } from '../helpers/db.js'

import { container } from 'tsyringe'
import { ConnectionRow } from '../../src/models/db/types.js'
import createHttpServer from '../../src/server.js'
import VeritableCloudagentEvents from '../../src/services/veritableCloudagentEvents.js'
import { withBobAndCharlie } from '../helpers/connection.js'
import { fetchPost, post } from '../helpers/routeHelper.js'

export type Context = {
  app: express.Express
  agent: {
    alice: VeritableCloudagent
    bob: VeritableCloudagent
    charlie: VeritableCloudagent
  }
  cloudagentEvents: VeritableCloudagentEvents
  db: {
    alice: Database
    bob: Database
    charlie: Database
  }
  aliceConnectionId: string
  charliesConnections: {
    withBob: ConnectionRow
  }
  bobsConnections: {
    withCharlie: ConnectionRow
    withAlice: ConnectionRow
  }
  response: Awaited<ReturnType<typeof post>>
}

describe('partial query aggregation', function () {
  this.timeout(30000)
  afterEach(async () => {
    await cleanup()
  })

  withCompanyHouseMock()

  describe('with established connections: Alice -> Bob -> Charlie', function () {
    const context: Context = {
      db: {
        alice: container.resolve(Database),
      },
      agent: {},
      bobsConnections: {},
      charliesConnections: {},
    } as unknown as Context

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
      await cleanup()
    })

    withBobAndCharlie(context)

    beforeEach(async function () {
      context.response = await post(context.app, `/queries/new/scope-3-carbon-consumption/stage`, {
        connectionId: context.aliceConnectionId,
        productId: 'toaster-001(AliceReq)',
        quantity: 1,
        action: 'success',
      })

      const queryId = await context.db.bob.get('query').then((res) => res[0].id)
      const { withAlice, withCharlie } = context.bobsConnections

      await fetchPost(`http://localhost:3001/queries/scope-3-carbon-consumption/${queryId}/response`, {
        companyId: withAlice.id,
        action: 'success',
        emissions: '200',
        partialQuery: ['on'],
        partialSelect: ['on'],
        productIds: ['heating-el-001(BobReq)'],
        quantities: ['10'],
        connectionIds: [withCharlie.id],
      })
    })

    it('Alice sends a query request for co2 emissions to Bob', async function () {
      const [query] = await context.db.alice.get('query')

      expect(context.response.statusCode).to.equal(200)
      expect(query).to.deep.contain({
        connection_id: context.aliceConnectionId,
        parent_id: null,
        query_type: 'Scope 3 Carbon Consumption',
        status: 'pending_their_input',
        details: { quantity: 1, productId: 'toaster-001(AliceReq)' },
        response_id: null,
        query_response: null,
        role: 'requester',
      })
    })

    it('syncs up queries and Bob sees forwarded to Charlie and from Alice', async function () {
      const [fromAlice, toCharlie] = await context.db.bob.get('query', {}, [['updated_at', 'desc']])
      const [aliceQuery] = await context.db.alice.get('query')
      const { withAlice, withCharlie } = context.bobsConnections

      expect(fromAlice.status).to.be.equal('forwarded')
      expect(fromAlice).to.deep.contain({
        connection_id: withAlice.id,
        parent_id: null,
        query_type: 'Scope 3 Carbon Consumption',
        status: 'forwarded',
        details: { quantity: 1, productId: 'toaster-001(AliceReq)' },
        response_id: aliceQuery.id,
        query_response: null,
        role: 'responder',
      })
      expect(toCharlie.status).to.be.equal('pending_their_input')
      expect(toCharlie).to.deep.contain({
        connection_id: withCharlie.id,
        parent_id: fromAlice.id,
        query_type: 'Scope 3 Carbon Consumption',
        status: 'pending_their_input',
        details: {
          query: 'Scope 3 Carbon Consumption',
          quantity: 10,
          productId: 'heating-el-001(BobReq)',
          emissions: '200',
        },
        response_id: null,
        query_response: null,
        role: 'requester',
      })
    })

    it('persists a forwarded query on Charlies side', async () => {
      const [charlieQuery] = await context.db.charlie.get('query')
      const [bobQuery] = await context.db.bob.get('query', { status: 'pending_their_input' })

      expect(charlieQuery).to.deep.contain({
        parent_id: null,
        query_type: 'Scope 3 Carbon Consumption',
        status: 'pending_your_input',
        details: { quantity: 10, productId: 'heating-el-001(BobReq)' },
        response_id: bobQuery.id,
        query_response: null,
        role: 'responder',
      })
    })

    describe('and when Charlie responds to partial query', () => {
      beforeEach(async () => {
        const queryId = await context.db.charlie.get('query').then((res) => res[0].id)

        await fetchPost(`http://localhost:3002/queries/scope-3-carbon-consumption/${queryId}/response`, {
          companyId: context.charliesConnections.withBob.id,
          action: 'success',
          emissions: '500',
        })
      })

      it('updates both Bobs queries to resolved along with query responses', async () => {
        const { withAlice, withCharlie } = context.bobsConnections
        const [bobQuery] = await context.db.bob.get('query', { connection_id: withAlice.id })
        const [bobPartialQuery] = await context.db.bob.get('query', { connection_id: withCharlie.id })

        expect(bobQuery.status).to.be.equal('resolved')
        expect(bobQuery).to.deep.contain({
          connection_id: withAlice.id,
          parent_id: null,
          query_type: 'Scope 3 Carbon Consumption',
          details: {
            quantity: 1,
            emissions: '700',
            productId: 'toaster-001(AliceReq)',
          },
          query_response: '700',
          role: 'responder',
        })

        expect(bobPartialQuery.status).to.be.equal('resolved')
        expect(bobPartialQuery).to.deep.contain({
          connection_id: withCharlie.id,
          parent_id: bobQuery.id,
          query_type: 'Scope 3 Carbon Consumption',
          status: 'resolved',
          details: {
            query: 'Scope 3 Carbon Consumption',
            quantity: 10,
            emissions: '200',
            productId: 'heating-el-001(BobReq)',
          },
          response_id: null,
          query_response: '500',
          role: 'requester',
        })
      })

      it('also updates Alice query as resolved with a total of Bob and Charlie co2 emissions', async () => {
        const [query] = await context.db.alice.get('query')

        expect(query).to.have.key('query_response').that.is.equal('700')
        expect(query).to.deep.contain({
          parent_id: null,
          query_type: 'Scope 3 Carbon Consumption',
          status: 'resolved',
          details: { quantity: 1, productId: 'toaster-001(AliceReq)' },
          response_id: null,
          query_response: '700',
          role: 'requester',
        })
      })
    })
  })
})
