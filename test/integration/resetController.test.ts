import { expect } from 'chai'
import type express from 'express'
import { afterEach, beforeEach, describe } from 'mocha'
import { container } from 'tsyringe'

import { cleanupCloudagent } from '../helpers/cloudagent.js'
import { cleanupDatabase } from '../helpers/db.js'

import Database from '../../src/models/db/index.js'
import { ConnectionRow } from '../../src/models/db/types.js'
import VeritableCloudagent from '../../src/models/veritableCloudagent/index.js'
import { Connection } from '../../src/models/veritableCloudagent/internal.js'
import createHttpServer from '../../src/server.js'
import VeritableCloudagentEvents from '../../src/services/veritableCloudagentEvents.js'
import { withVerifiedConnection } from '../helpers/connection.js'
import { del } from '../helpers/routeHelper.js'

describe('integration test for /reset endpoint', function () {
  const db = container.resolve(Database)
  const cloudagent = container.resolve(VeritableCloudagent)

  afterEach(async () => {
    await cleanupDatabase()
  })

  describe('if DEMO_MODE=true', function () {
    type Context = {
      app: express.Express
      cloudagentEvents: VeritableCloudagentEvents
      remoteDatabase: Database
      remoteCloudagent: VeritableCloudagent
      remoteConnectionId: string
      localConnectionId: string
      response: Awaited<ReturnType<typeof del>>
    }
    const context: Context = {} as Context

    beforeEach(async function () {
      await cleanupDatabase()
      await cleanupCloudagent()
      const server = await createHttpServer(false)
      Object.assign(context, {
        ...server,
      })
    })

    afterEach(async function () {
      await cleanupCloudagent()
      context.cloudagentEvents.stop()
    })

    withVerifiedConnection(context)

    it('removes all connections and credentials and returns 200', async function () {
      const localConnections: ConnectionRow[] = await db.get('connection', {})
      const agentConnections: Connection[] = await cloudagent.getConnections()
      expect(localConnections.length).to.equal(1)
      expect(agentConnections.length).to.equal(1)

      context.response = await del(context.app, '/reset')
      const localConnectionsNew: ConnectionRow[] = await db.get('connection', {})
      const agentConnectionsNew: Connection[] = await cloudagent.getConnections()

      expect(context.response.statusCode).to.equal(200)
      expect(localConnectionsNew.length).to.be.equal(0)
      expect(agentConnectionsNew.length).to.be.equal(0)
    })
  })
})
