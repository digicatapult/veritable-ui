import { expect } from 'chai'
import { afterEach, beforeEach, describe } from 'mocha'

import { ConnectionRow } from '../../src/models/db/types.js'
import { Connection } from '../../src/models/veritableCloudagent/internal.js'
import { cleanupCloudagent, cleanupDatabase } from '../helpers/cleanup.js'
import { setupTwoPartyContext, TwoPartyContext, withVerifiedConnection } from '../helpers/connection.js'
import { del } from '../helpers/routeHelper.js'

describe('integration test for /reset endpoint', function () {
  const context: TwoPartyContext = {} as TwoPartyContext
  let response: Awaited<ReturnType<typeof del>>

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
