import VeritableCloudagent from '../../src/models/veritableCloudagent/index.js'

import Database from '../../src/models/db/index.js'
import { tablesList } from '../../src/models/db/types.js'

// Call cleanup on all UI databases in parallel but delete tables in series
export async function cleanupDatabase(databases: Database[]) {
  console.debug('Database Cleanup')
  await Promise.all(
    databases.map(async (db) => {
      for (const table of tablesList) {
        await db.delete(table, {})
      }
    })
  )
}

// Cleanup all agents in parallel
// Delete all connections and OOB invitations in series
export async function cleanupCloudagent(cloudagents: VeritableCloudagent[]) {
  console.debug('Cloudagent Cleanup')
  await Promise.all(
    cloudagents.map(async (agent) => {
      const connections = await agent.getConnections()
      for (const connection of connections) {
        await agent.closeConnection(connection.id, 'delete')
        if (connection.outOfBandId) {
          await agent.deleteOutOfBandInvite(connection.outOfBandId)
        }
      }
      const credentials = await agent.getCredentials()
      for (const credential of credentials) {
        await agent.deleteCredential(credential.id)
      }
    })
  )
}
