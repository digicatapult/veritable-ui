import { expect } from 'chai'
import { afterEach, beforeEach, describe } from 'mocha'
import { carbonEmbodimentResponseData } from '../../src/models/drpc.js'
import { cleanupCloudagent, cleanupDatabase } from '../helpers/cleanup.js'
import { setupThreePartyContext, ThreePartyContext, withBobAndCharlie } from '../helpers/connection.js'
import { insertCompanyHouseRegistry } from '../helpers/registries.js'
import { fetchPost, post } from '../helpers/routeHelper.js'
describe('partial query aggregation', function () {
  const context: ThreePartyContext = {} as ThreePartyContext
  let response: Awaited<ReturnType<typeof post>>

  beforeEach(async () => {
    await setupThreePartyContext(context)
    await cleanupCloudagent([context.agent.alice, context.agent.bob, context.agent.charlie])
    await cleanupDatabase([context.db.alice, context.db.bob, context.db.charlie])
    await insertCompanyHouseRegistry()
  })

  afterEach(async () => {
    context.cloudagentEvents.stop()
  })

  describe('with established connections: Alice -> Bob -> Charlie', function () {
    beforeEach(async function () {
      await withBobAndCharlie(context)
      response = await post(context.app, `/queries/carbon-embodiment`, {
        connectionId: context.aliceConnectionId,
        productId: 'toaster-001(AliceReq)',
        quantity: 1,
      })

      const queryId = await context.db.bob.get('query').then((res) => res[0].id)
      const { withAlice, withCharlie } = context.bobsConnections

      await fetchPost(`http://localhost:3001/queries/${queryId}/response/carbon-embodiment`, {
        companyId: withAlice.id,
        emissions: '200',
        partialQuery: ['on'],
        partialSelect: ['on'],
        productIds: ['heating-el-001(BobReq)'],
        quantities: [10],
        connectionIds: [withCharlie.id],
      })
    })

    it('Alice sends a query request for co2 emissions to Bob', async function () {
      const [query] = await context.db.alice.get('query')

      expect(response.statusCode).to.equal(200)
      expect(query).to.deep.contain({
        connection_id: context.aliceConnectionId,
        parent_id: null,
        type: 'total_carbon_embodiment',
        status: 'pending_their_input',
        details: {
          subjectId: {
            idType: 'product_and_quantity',
            content: {
              quantity: 1,
              productId: 'toaster-001(AliceReq)',
            },
          },
        },
        response_id: null,
        response: null,
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
        type: 'total_carbon_embodiment',
        status: 'forwarded',
        details: {
          subjectId: {
            idType: 'product_and_quantity',
            content: {
              quantity: 1,
              productId: 'toaster-001(AliceReq)',
            },
          },
        },
        response_id: aliceQuery.id,
        response: {
          mass: 200,
          unit: 'kg',
          partialResponses: [],
          subjectId: {
            idType: 'product_and_quantity',
            content: {
              quantity: 1,
              productId: 'toaster-001(AliceReq)',
            },
          },
        },
        role: 'responder',
      })
      expect(toCharlie.status).to.be.equal('pending_their_input')
      expect(toCharlie).to.deep.contain({
        connection_id: withCharlie.id,
        parent_id: fromAlice.id,
        type: 'total_carbon_embodiment',
        status: 'pending_their_input',
        details: {
          subjectId: {
            idType: 'product_and_quantity',
            content: {
              quantity: 10,
              productId: 'heating-el-001(BobReq)',
            },
          },
        },
        response_id: null,
        response: null,
        role: 'requester',
      })
    })

    it('persists a forwarded query on Charlies side', async () => {
      const [charlieQuery] = await context.db.charlie.get('query')
      const [bobQuery] = await context.db.bob.get('query', { status: 'pending_their_input' })

      expect(charlieQuery).to.deep.contain({
        parent_id: null,
        type: 'total_carbon_embodiment',
        status: 'pending_your_input',
        details: {
          subjectId: {
            idType: 'product_and_quantity',
            content: {
              quantity: 10,
              productId: 'heating-el-001(BobReq)',
            },
          },
        },
        response_id: bobQuery.id,
        response: null,
        role: 'responder',
      })
    })

    describe('and when Charlie responds to partial query', () => {
      beforeEach(async () => {
        const queryId = await context.db.charlie.get('query').then((res) => res[0].id)

        await fetchPost(`http://localhost:3002/queries/${queryId}/response/carbon-embodiment`, {
          companyId: context.charliesConnections.withBob.id,
          emissions: '500',
        })
      })

      it('updates both Bobs queries to resolved along with query responses', async () => {
        const { withAlice, withCharlie } = context.bobsConnections
        const [bobQuery] = await context.db.bob.get('query', { connection_id: withAlice.id })
        const [bobPartialQuery] = await context.db.bob.get('query', { connection_id: withCharlie.id })
        const response = carbonEmbodimentResponseData.parse(bobQuery.response)

        expect(bobQuery.status).to.be.equal('resolved')
        expect(bobQuery).to.deep.contain({
          connection_id: withAlice.id,
          parent_id: null,
          type: 'total_carbon_embodiment',
          details: {
            subjectId: {
              idType: 'product_and_quantity',
              content: {
                quantity: 1,
                productId: 'toaster-001(AliceReq)',
              },
            },
          },
          response: {
            mass: 200,
            unit: 'kg',
            partialResponses: [
              {
                id: `${response.partialResponses[0].id}`,
                data: {
                  mass: 500,
                  unit: 'kg',
                  partialResponses: [],
                  subjectId: {
                    idType: 'product_and_quantity',
                    content: {
                      quantity: 10,
                      productId: 'heating-el-001(BobReq)',
                    },
                  },
                },
                type: 'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_types/total_carbon_embodiment/response/0.1',
              },
            ],
            subjectId: {
              idType: 'product_and_quantity',
              content: {
                quantity: 1,
                productId: 'toaster-001(AliceReq)',
              },
            },
          },
          role: 'responder',
        })

        expect(bobPartialQuery.status).to.be.equal('resolved')
        expect(bobPartialQuery).to.deep.contain({
          connection_id: withCharlie.id,
          parent_id: bobQuery.id,
          type: 'total_carbon_embodiment',
          status: 'resolved',
          details: {
            subjectId: {
              idType: 'product_and_quantity',
              content: {
                quantity: 10,
                productId: 'heating-el-001(BobReq)',
              },
            },
          },
          response_id: null,
          response: {
            mass: 500,
            unit: 'kg',
            partialResponses: [],
            subjectId: {
              idType: 'product_and_quantity',
              content: {
                quantity: 10,
                productId: 'heating-el-001(BobReq)',
              },
            },
          },
          role: 'requester',
        })
      })

      it('also updates Alice query as resolved with a total of Bob and Charlie co2 emissions', async () => {
        const [query] = await context.db.alice.get('query')
        const response = carbonEmbodimentResponseData.parse(query.response)

        expect(query).to.deep.contain({
          parent_id: null,
          type: 'total_carbon_embodiment',
          status: 'resolved',
          details: {
            subjectId: {
              idType: 'product_and_quantity',
              content: {
                quantity: 1,
                productId: 'toaster-001(AliceReq)',
              },
            },
          },
          response_id: null,
          response: {
            mass: 200,
            unit: 'kg',
            subjectId: {
              idType: 'product_and_quantity',
              content: {
                quantity: 1,
                productId: 'toaster-001(AliceReq)',
              },
            },
            partialResponses: [
              {
                id: `${response.partialResponses[0].id}`,
                type: 'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_types/total_carbon_embodiment/response/0.1',
                data: {
                  mass: 500,
                  unit: 'kg',
                  subjectId: {
                    idType: 'product_and_quantity',
                    content: {
                      quantity: 10,
                      productId: 'heating-el-001(BobReq)',
                    },
                  },
                  partialResponses: [],
                },
              },
            ],
          },
          role: 'requester',
        })
      })
    })
  })
})
