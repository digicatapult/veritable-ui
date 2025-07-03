import { expect } from 'chai'
import knex from 'knex'
import { afterEach, beforeEach, describe } from 'mocha'
import { container } from 'tsyringe'
import Database from '../../src/models/db/index.js'
import { QueryRow } from '../../src/models/db/types.js'
import VeritableCloudagent from '../../src/models/veritableCloudagent/index.js'
import createHttpServer from '../../src/server.js'
import { cleanupCloudagent, cleanupDatabase } from '../helpers/cleanup.js'
import { TwoPartyConnection, withVerifiedConnection } from '../helpers/connection.js'
import { bobDbConfig, mockEnvBob } from '../helpers/fixtures.js'
import { mockLogger } from '../helpers/logger.js'
import { post } from '../helpers/routeHelper.js'
import { delay } from '../helpers/util.js'

describe('query submission', function () {
  const context: TwoPartyConnection = {} as TwoPartyConnection

  afterEach(async () => {
    await cleanupDatabase()
  })

  describe('Carbon embodiment query success', function () {
    let response: Awaited<ReturnType<typeof post>>

    beforeEach(async function () {
      await cleanupDatabase()
      await cleanupCloudagent()
      context.localCloudagent = container.resolve(VeritableCloudagent)
      context.localDatabase = container.resolve(Database)
      context.remoteCloudagent = new VeritableCloudagent(mockEnvBob, mockLogger)
      context.remoteDatabase = new Database(knex(bobDbConfig))
      const server = await createHttpServer(true)
      Object.assign(context, {
        ...server,
      })
    })

    afterEach(async function () {
      await cleanupCloudagent()
      context.cloudagentEvents.stop()
    })

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
