import express from 'express'
import { container } from 'tsyringe'
import VeritableCloudagent from '../../src/models/veritableCloudagent/index.js'
import { post } from '../helpers/routeHelper.js'
import { alice } from './fixtures.js'

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

export async function withAliceReceivesBobsInvite(context: {
  app: express.Express
  remoteCloudagent: VeritableCloudagent
}) {
  const invite = await context.remoteCloudagent.createOutOfBandInvite({ companyName: alice.company_name })
  const inviteContent = Buffer.from(
    JSON.stringify({
      companyNumber: alice.company_number,
      inviteUrl: invite.invitationUrl,
    }),
    'utf8'
  ).toString('base64url')

  return await post(context.app, '/connection/new/receive-invitation', {
    invite: inviteContent,
    action: 'createConnection',
  })
}
