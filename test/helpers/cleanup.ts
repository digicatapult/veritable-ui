import VeritableCloudagent from '../../src/models/veritableCloudagent/index.js'

import Database from '../../src/models/db/index.js'
import { tablesList } from '../../src/models/db/types.js'

export async function cleanupDatabase(database: Database[]) {
  for (const db of database) {
    for (const table of tablesList) {
      await db.delete(table, {})
    }
  }
}

export async function cleanupCloudagent(cloudagent: VeritableCloudagent[]) {
  for (const agent of cloudagent) {
    const connections = await agent.getConnections()
    for (const connection of connections) {
      await agent.closeConnection(connection.id)
    }
  }
}
