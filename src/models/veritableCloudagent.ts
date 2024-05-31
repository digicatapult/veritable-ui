import { injectable, singleton } from 'tsyringe'
import { z } from 'zod'

import { Env } from '../env.js'
import { InternalError } from '../errors.js'

const oobParser = z.object({
  invitationUrl: z.string(),
  invitation: z
    .object({
      '@id': z.string(),
    })
    .transform(({ '@id': id }) => ({ id })),
})
type OutOfBandInvite = z.infer<typeof oobParser>

@singleton()
@injectable()
export default class VeritableCloudagent {
  constructor(private env: Env) {}

  public async createOutOfBandInvite(params: { companyName: string }): Promise<OutOfBandInvite> {
    const url = `${this.env.get('CLOUDAGENT_ADMIN_ORIGIN')}/oob/create-invitation`
    const request = {
      alias: params.companyName,
      handshake: true,
      multiUseInvitation: false,
      autoAcceptConnection: true,
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new InternalError(`Unexpected error creating out-of-band-invite: ${response.statusText}`)
    }

    try {
      return oobParser.parse(await response.json())
    } catch (err) {
      if (err instanceof Error) {
        throw new InternalError(
          `Error parsing out-of-band invite creation request response: ${err.name} - ${err.message}`
        )
      }
      throw new InternalError('Unknown error parsing oob invite create')
    }
  }
}
