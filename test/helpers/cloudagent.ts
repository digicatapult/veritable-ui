import { container } from 'tsyringe'

import VeritableCloudagent from '../../src/models/veritableCloudagent/index.js'
import { alice, mockEnvBob } from './fixtures.js'
import { mockLogger } from './logger.js'

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

export function withBobCloudAgentInvite(context: { invite: string }) {
  const agent = new VeritableCloudagent(mockEnvBob, mockLogger)

  beforeEach(async function () {
    await cleanupShared(agent)
    const invite = await agent.createOutOfBandInvite({ companyName: alice.company_name })
    context.invite = Buffer.from(
      JSON.stringify({
        companyNumber: alice.company_number,
        inviteUrl: invite.invitationUrl,
      }),
      'utf8'
    ).toString('base64url')
  })

  afterEach(async () => await cleanupShared(agent))
}

export function withBobCloudagentAcceptInvite(context: { inviteUrl: string }) {
  const agent = new VeritableCloudagent(mockEnvBob, mockLogger)

  beforeEach(async function () {
    await cleanupShared(agent)
    await agent.receiveOutOfBandInvite({ companyName: alice.company_name, invitationUrl: context.inviteUrl })
  })

  afterEach(async () => await cleanupShared(agent))
}
