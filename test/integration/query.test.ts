import { expect } from 'chai'
import { afterEach, beforeEach, describe } from 'mocha'
import { QueryRow } from '../../src/models/db/types.js'
import { cleanupCloudagent, cleanupDatabase } from '../helpers/cleanup.js'
import { setupTwoPartyContext, TwoPartyConnection, withVerifiedConnection } from '../helpers/connection.js'
import { post } from '../helpers/routeHelper.js'
import { delay } from '../helpers/util.js'

describe('query submission', function () {
  const context: TwoPartyConnection = {} as TwoPartyConnection

  beforeEach(async function () {
    await setupTwoPartyContext(context)

    await cleanupCloudagent([context.localCloudagent, context.remoteCloudagent])
    await cleanupDatabase([context.localDatabase, context.remoteDatabase])
  })

  afterEach(async () => {
    context.cloudagentEvents.stop()
    await cleanupCloudagent([context.localCloudagent, context.remoteCloudagent])
    await cleanupDatabase([context.localDatabase, context.remoteDatabase])
  })

  describe('Carbon embodiment query success', function () {
    let response: Awaited<ReturnType<typeof post>>

    withVerifiedConnection(context)

    beforeEach(async function () {
      response = await post(context.app, `/queries/new/carbon-embodiment`, {
        connectionId: context.localConnectionId,
        productId: 'Test',
        quantity: 1,
      })
    })

    it('should response 200', async function () {
      expect(response.statusCode).to.equal(200)
    })

    it('should set local query state to pending_their_input', async function () {
      let queryLocal: QueryRow | null | undefined
      const pollLimit = 100
      for (let i = 1; i <= pollLimit; i++) {
        queryLocal = (await context.localDatabase.get('query', { connection_id: context.localConnectionId }))[0]
        if (queryLocal?.status === 'pending_their_input') {
          break
        }
        await delay(10)
        if (i === pollLimit) {
          expect.fail('Expected query to be visible locally')
        }
      }

      expect(queryLocal as QueryRow).deep.include({
        status: 'pending_their_input',
        type: 'total_carbon_embodiment',
        details: {
          subjectId: {
            idType: 'product_and_quantity',
            content: {
              quantity: 1,
              productId: 'Test',
            },
          },
        },
      })
    })

    it('should set local query state to pending_your_input', async function () {
      let queryRemote: QueryRow | null | undefined
      const pollLimit = 100
      for (let i = 1; i <= pollLimit; i++) {
        queryRemote = (await context.remoteDatabase.get('query', { connection_id: context.remoteConnectionId }))[0]
        if (queryRemote?.status === 'pending_your_input') {
          break
        }
        await delay(10)
        if (i === pollLimit) {
          expect.fail('Expected query to be visible on remote')
        }
      }

      expect(queryRemote as QueryRow).deep.include({
        status: 'pending_your_input',
        type: 'total_carbon_embodiment',
        details: {
          subjectId: {
            idType: 'product_and_quantity',
            content: {
              quantity: 1,
              productId: 'Test',
            },
          },
        },
      })
    })
  })
})
