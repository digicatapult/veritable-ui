import { container } from 'tsyringe'
import VeritableCloudagent from '../../src/models/veritableCloudagent/index.js'

import Database from '../../src/models/db/index.js'
import { tablesList } from '../../src/models/db/types.js'

const db = container.resolve(Database)

// Used in all integration tests
export async function cleanupDatabase() {
  tablesList.forEach(async (table) => await db.delete(table, {}))
}

const cleanupShared = async function (agent: VeritableCloudagent) {
  const connections = await agent.getConnections()
  for (const connection of connections) {
    await agent.deleteConnection(connection.id)
  }
}

// Used in all integration tests
export async function cleanupCloudagent() {
  const agent = container.resolve(VeritableCloudagent)
  await cleanupShared(agent)
}

// Used in test/helpers/connection.ts
export const cleanupConnections = async (agent: VeritableCloudagent, db: Database) => {
  for (const { id } of await agent.getConnections()) {
    await agent.deleteConnection(id)
  }
  await db.delete('connection', {})
}

export const cleanupRemote = async (context: { remoteCloudagent: VeritableCloudagent; remoteDatabase: Database }) => {
  for (const { id } of await context.remoteCloudagent.getConnections()) {
    await context.remoteCloudagent.deleteConnection(id)
  }
  await context.remoteDatabase.delete('connection', {})
}
