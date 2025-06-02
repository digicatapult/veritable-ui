import { expect } from 'chai'
import type express from 'express'
import { afterEach, beforeEach, describe } from 'mocha'
import { container } from 'tsyringe'

import Database from '../../src/models/db/index.js'
import VeritableCloudagent from '../../src/models/veritableCloudagent/index.js'
import { cleanupCloudagent } from '../helpers/cloudagent.js'
import { withCompanyHouseMock } from '../helpers/companyHouse.js'
import { cleanup } from '../helpers/db.js'

import { QueryRow } from '../../src/models/db/types.js'
import createHttpServer from '../../src/server.js'
import VeritableCloudagentEvents from '../../src/services/veritableCloudagentEvents.js'
import { withVerifiedConnection } from '../helpers/connection.js'
import { post } from '../helpers/routeHelper.js'
import { delay } from '../helpers/util.js'

describe('query submission', function () {
  const db = container.resolve(Database)

  afterEach(async () => {
    await cleanup()
  })
  withCompanyHouseMock()

  describe('Carbon embodiment query success', function () {
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

    beforeEach(async function () {
      await cleanup()
      await cleanupCloudagent()
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
      context.response = await post(context.app, `/queries/new/carbon-embodiment`, {
        connectionId: context.localConnectionId,
        productId: 'Test',
        quantity: 1,
      })
    })

    it('should response 200', async function () {
      expect(context.response.statusCode).to.equal(200)
    })

    it('should set local query state to pending_their_input', async function () {
      let queryLocal: QueryRow | null | undefined
      const pollLimit = 100
      for (let i = 1; i <= pollLimit; i++) {
        queryLocal = (await db.get('query', { connection_id: context.localConnectionId }))[0]
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
