import { expect } from 'chai'
import knex from 'knex'
import { afterEach, beforeEach, describe } from 'mocha'
import { container } from 'tsyringe'

import Database from '../../src/models/db/index.js'
import { ConnectionRow } from '../../src/models/db/types.js'
import EmailService from '../../src/models/emailService/index.js'
import VeritableCloudagent from '../../src/models/veritableCloudagent/index.js'
import { Connection } from '../../src/models/veritableCloudagent/internal.js'
import createHttpServer from '../../src/server.js'
import { cleanupCloudagent, cleanupDatabase } from '../helpers/cleanup.js'
import { TwoPartyConnection, withVerifiedConnection } from '../helpers/connection.js'
import { bobDbConfig, mockEnvBob } from '../helpers/fixtures.js'
import { mockLogger } from '../helpers/logger.js'
import { del } from '../helpers/routeHelper.js'

describe('integration test for /reset endpoint', function () {
  const context: TwoPartyConnection = {} as TwoPartyConnection
  let response: Awaited<ReturnType<typeof del>>

  beforeEach(async function () {
    context.smtpServer = container.resolve(EmailService)
    context.localCloudagent = container.resolve(VeritableCloudagent)
    context.localDatabase = container.resolve(Database)
    context.remoteDatabase = new Database(knex(bobDbConfig))
    context.remoteCloudagent = new VeritableCloudagent(mockEnvBob, mockLogger)
    const server = await createHttpServer(true)
    Object.assign(context, {
      ...server,
    })
    await cleanupCloudagent([context.localCloudagent, context.remoteCloudagent])
    await cleanupDatabase([context.localDatabase, context.remoteDatabase])
  })

  afterEach(async () => {
    context.cloudagentEvents.stop()
    await cleanupCloudagent([context.localCloudagent, context.remoteCloudagent])
    await cleanupDatabase([context.localDatabase, context.remoteDatabase])
  })

  describe('if DEMO_MODE=true', function () {
    withVerifiedConnection(context)

    it('removes all connections and credentials and returns 200', async function () {
      const localConnections: ConnectionRow[] = await context.localDatabase.get('connection', {})
      const agentConnections: Connection[] = await context.localCloudagent.getConnections()
      expect(localConnections.length).to.equal(1)
      expect(agentConnections.length).to.equal(1)

      response = await del(context.app, '/reset')
      const localConnectionsNew: ConnectionRow[] = await context.localDatabase.get('connection', {})
      const agentConnectionsNew: Connection[] = await context.localCloudagent.getConnections()

      expect(response.statusCode).to.equal(200)
      expect(localConnectionsNew.length).to.be.equal(0)
      expect(agentConnectionsNew.length).to.be.equal(0)
    })
  })
})
