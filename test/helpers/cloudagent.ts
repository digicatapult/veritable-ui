import { Env } from '../../src/env.js'
import VeritableCloudagent from '../../src/models/veritableCloudagent.js'

import { validCompanyName, validCompanyNumber } from './fixtures.js'

export function withBobCloudAgentInvite(context: { invite: string }) {
  let agent = new VeritableCloudagent({
    get(name) {
      if (name === 'CLOUDAGENT_ADMIN_ORIGIN') {
        return 'http://localhost:3101'
      }
      throw new Error('Unexpected env variable request')
    },
  } as Env)

  beforeEach(async function () {
    const invite = await agent.createOutOfBandInvite({ companyName: validCompanyName })
    context.invite = Buffer.from(
      JSON.stringify({
        companyNumber: validCompanyNumber,
        inviteUrl: invite.invitationUrl,
      }),
      'utf8'
    ).toString('base64url')
  })
}
