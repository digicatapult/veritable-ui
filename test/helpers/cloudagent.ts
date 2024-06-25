import { pino } from 'pino'

import { Env } from '../../src/env.js'
import VeritableCloudagent from '../../src/models/veritableCloudagent.js'

import { container } from 'tsyringe'
import { type ILogger } from '../../src/logger.js'
import { validCompanyName, validCompanyNumber } from './fixtures.js'

const mockLogger: ILogger = pino({ level: 'silent' })

const cleanupShared = async function (agent: VeritableCloudagent) {
  const connections = await agent.getConnections()
  for (const connection of connections) {
    await agent.deleteConnection(connection.id)
  }
}

export async function cleanupCloudagent() {
  let agent = container.resolve(VeritableCloudagent)
  await cleanupShared(agent)
}

export function withBobCloudAgentInvite(context: { invite: string }) {
  let agent = new VeritableCloudagent(
    {
      get(name) {
        if (name === 'CLOUDAGENT_ADMIN_ORIGIN') {
          return 'http://localhost:3101'
        }
        throw new Error('Unexpected env variable request')
      },
    } as Env,
    mockLogger
  )

  beforeEach(async function () {
    await cleanupShared(agent)
    const invite = await agent.createOutOfBandInvite({ companyName: validCompanyName })
    context.invite = Buffer.from(
      JSON.stringify({
        companyNumber: validCompanyNumber,
        inviteUrl: invite.invitationUrl,
      }),
      'utf8'
    ).toString('base64url')
  })

  afterEach(async () => await cleanupShared(agent))
}

export function withBobCloudagentAcceptInvite(context: { inviteUrl: string }) {
  let agent = new VeritableCloudagent(
    {
      get(name) {
        if (name === 'CLOUDAGENT_ADMIN_ORIGIN') {
          return 'http://localhost:3101'
        }
        throw new Error('Unexpected env variable request')
      },
    } as Env,
    mockLogger
  )

  beforeEach(async function () {
    await cleanupShared(agent)
    await agent.receiveOutOfBandInvite({ companyName: validCompanyName, invitationUrl: context.inviteUrl })
  })

  afterEach(async () => await cleanupShared(agent))
}
