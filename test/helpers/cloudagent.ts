import { container } from 'tsyringe'
import VeritableCloudagent from '../../src/models/veritableCloudagent/index.js'

const cleanupShared = async function (agent: VeritableCloudagent) {
  const connections = await agent.getConnections()
  for (const connection of connections) {
    await agent.deleteConnection(connection.id)
  }
}

export async function cleanupCloudagent() {
  const agent = container.resolve(VeritableCloudagent)
  await cleanupShared(agent)
}
