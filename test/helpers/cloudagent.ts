import { container } from 'tsyringe'

import { Env } from '../../src/env/index.js'
import VeritableCloudagent from '../../src/models/veritableCloudagent/index.js'
import { validCompanyName, validCompanyNumber } from './fixtures.js'
import { mockLogger } from './logger.js'

const cleanupShared = async function (agent: VeritableCloudagent) {
  try {
    const connections = await agent.getConnections() // fails here in the after loop the clou
    for (const connection of connections) {
      await agent.deleteConnection(connection.id)
    }
  } catch (err) {
    console.log(err)
    console.log(err.name)
    console.log(err.message)
    console.log(`all errrors: `)
    console.log(err.errors)

    throw new Error(err)
  }
}

export async function cleanupCloudagent() {
  const agent = container.resolve(VeritableCloudagent)
  await cleanupShared(agent)
}

export function withBobCloudAgentInvite(context: { invite: string }) {
  const agent = new VeritableCloudagent(
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
  const agent = new VeritableCloudagent(
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
