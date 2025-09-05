import VeritableCloudagent from '../../src/models/veritableCloudagent/index.js'

import Database from '../../src/models/db/index.js'
import { tablesList } from '../../src/models/db/types.js'
import { delay } from './util.js'

// Cleanup one Cloudagent and its DB en-bloc
export async function testCleanup(agent: VeritableCloudagent, db: Database) {
  for (const table of tablesList) {
    await db.delete(table, {})
  }

  const connections = await agent.getConnections()
  for (const connection of connections) {
    await agent.closeConnection(connection.id, true)
  }

  const invites = await agent.getOutOfBandInvites()
  for (const invite of invites) {
    await agent.deleteOutOfBandInvite(invite.id)
  }

  const credentials = await agent.getCredentials()
  for (const credential of credentials) {
    await agent.deleteCredential(credential.id)
  }

  // Small delay to allow for hangup processing by peers
  await delay(20)
}
