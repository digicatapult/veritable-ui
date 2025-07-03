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
    for (const { id } of await agent.getConnections()) {
      await agent.deleteConnection(id)
    }
  }
}

// Used in test/helpers/connection.ts
export const cleanupConnections = async (agent: VeritableCloudagent, db: Database) => {
  for (const { id } of await agent.getConnections()) {
    await agent.deleteConnection(id)
  }
  await db.delete('connection', {})
}

// Used in test/helpers/connection.ts
export const cleanupRemote = async (context: { remoteCloudagent: VeritableCloudagent; remoteDatabase: Database }) => {
  for (const { id } of await context.remoteCloudagent.getConnections()) {
    await context.remoteCloudagent.deleteConnection(id)
  }
  await context.remoteDatabase.delete('connection', {})
}
