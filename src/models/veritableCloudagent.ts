import { inject, injectable, singleton } from 'tsyringe'
import { z } from 'zod'

import { Env } from '../env.js'
import { InternalError } from '../errors.js'
import { Logger, type ILogger } from '../logger.js'

const oobParser = z.object({
  invitationUrl: z.string(),
  invitation: z.object({
    outOfBandRecord: z.object({ id: z.string() }),
  }),
})
type OutOfBandInvite = z.infer<typeof oobParser>

const receiveUrlParser = z.object({
  outOfBandRecord: z.object({
    id: z.string(),
  }),
  connectionRecord: z.object({
    id: z.string(),
  }),
})
type ReceiveUrlResponse = z.infer<typeof receiveUrlParser>

export const connectionParser = z.object({
  id: z.string(),
  state: z.union([
    z.literal('start'),
    z.literal('invitation-sent'),
    z.literal('invitation-received'),
    z.literal('request-sent'),
    z.literal('request-received'),
    z.literal('response-sent'),
    z.literal('response-received'),
    z.literal('abandoned'),
    z.literal('completed'),
  ]),
  outOfBandId: z.string(),
})
export type Connection = z.infer<typeof connectionParser>

const connectionListParser = z.array(connectionParser)

@singleton()
@injectable()
export default class VeritableCloudagent {
  constructor(
    private env: Env,
    @inject(Logger) protected logger: ILogger
  ) {}

  public async createOutOfBandInvite(params: { companyName: string }): Promise<OutOfBandInvite> {
    return this.postRequest(
      '/v1/oob/create-invitation',
      {
        alias: params.companyName,
        handshake: true,
        multiUseInvitation: false,
        autoAcceptConnection: true,
      },
      oobParser
    )
  }

  public async receiveOutOfBandInvite(params: {
    companyName: string
    invitationUrl: string
  }): Promise<ReceiveUrlResponse> {
    return this.postRequest(
      '/v1/oob/receive-invitation-url',
      {
        alias: params.companyName,
        autoAcceptConnection: true,
        autoAcceptInvitation: true,
        reuseConnection: true,
        invitationUrl: params.invitationUrl,
      },
      receiveUrlParser
    )
  }

  public async getConnections(): Promise<Connection[]> {
    return this.getRequest('/v1/connections', connectionListParser)
  }

  private async getRequest<O, I>(path: string, parser: z.ZodType<O, z.ZodTypeDef, I>): Promise<O> {
    const url = `${this.env.get('CLOUDAGENT_ADMIN_ORIGIN')}${path}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new InternalError(`Unexpected error calling GET ${path}: ${response.statusText}`)
    }

    try {
      return parser.parse(await response.json())
    } catch (err) {
      if (err instanceof Error) {
        throw new InternalError(`Error parsing response from calling GET ${path}: ${err.name} - ${err.message}`)
      }
      throw new InternalError(`Unknown error parsing response to calling GET ${path}`)
    }
  }

  private async postRequest<O, I>(
    path: string,
    body: Record<string, unknown>,
    parser: z.ZodType<O, z.ZodTypeDef, I>
  ): Promise<O> {
    const url = `${this.env.get('CLOUDAGENT_ADMIN_ORIGIN')}${path}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new InternalError(`Unexpected error calling POST ${path}: ${response.statusText}`)
    }

    try {
      const asJson = await response.json()
      return parser.parse(asJson)
    } catch (err) {
      if (err instanceof Error) {
        throw new InternalError(`Error parsing response from calling POST ${path}: ${err.name} - ${err.message}`)
      }
      throw new InternalError(`Unknown error parsing response to calling POST ${path}`)
    }
  }
}
