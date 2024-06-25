import { inject, injectable, singleton } from 'tsyringe'
import { z } from 'zod'

import { Env, type PartialEnv } from '../env.js'
import { InternalError } from '../errors.js'
import { Logger, type ILogger } from '../logger.js'

const oobParser = z.object({
  invitationUrl: z.string(),
  outOfBandRecord: z.object({ id: z.string() }),
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

export const didDocumentParser = z.object({
  id: z.string(),
})
export type DidDocument = z.infer<typeof didDocumentParser>

export const didCreateParser = z.object({
  didDocument: didDocumentParser,
})
export const didListParser = z.array(didCreateParser)

export const schemaParser = z.object({
  id: z.string(),
  issuerId: z.string(),
  name: z.string(),
  version: z.string(),
  attrNames: z.array(z.string()),
})
export type Schema = z.infer<typeof schemaParser>

export const credentialDefinitionParser = z.object({
  id: z.string(),
  issuerId: z.string(),
  schemaId: z.string(),
})
export type CredentialDefinition = z.infer<typeof credentialDefinitionParser>

const connectionListParser = z.array(connectionParser)
const schemaListParser = z.array(schemaParser)
const credentialDefinitionListParser = z.array(credentialDefinitionParser)

type parserFn<O> = (res: Response) => O | Promise<O>

@singleton()
@injectable()
export default class VeritableCloudagent {
  constructor(
    @inject(Env) private env: PartialEnv<'CLOUDAGENT_ADMIN_ORIGIN'>,
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
      this.buildParser(oobParser)
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
      this.buildParser(receiveUrlParser)
    )
  }

  public async getConnections(): Promise<Connection[]> {
    return this.getRequest('/v1/connections', this.buildParser(connectionListParser))
  }

  public async deleteConnection(id: string): Promise<void> {
    return this.deleteRequest(`/v1/connections/${id}`, () => {})
  }

  public async createDid(method: string, options: Record<string, string>): Promise<DidDocument> {
    return this.postRequest('/v1/dids/create', { method, options }, this.buildParser(didCreateParser)).then(
      (res) => res.didDocument
    )
  }

  public async getCreatedDids(filters: Partial<{ method: string }> = {}): Promise<DidDocument[]> {
    const params = new URLSearchParams({
      createdLocally: 'true',
      ...filters,
    }).toString()

    return this.getRequest(`/v1/dids?${params}`, this.buildParser(didListParser)).then((dids) =>
      dids.map((did) => did.didDocument)
    )
  }

  public async createSchema(issuerId: string, name: string, version: string, attrNames: string[]): Promise<Schema> {
    return this.postRequest('/v1/schemas', { issuerId, name, version, attrNames }, this.buildParser(schemaParser))
  }

  public async getCreatedSchemas(
    filters: Partial<{ issuerId: string; schemaName: string; schemaVersion: string }> = {}
  ): Promise<Schema[]> {
    const params = new URLSearchParams({
      createdLocally: 'true',
      ...filters,
    }).toString()

    return this.getRequest(`/v1/schemas?${params}`, this.buildParser(schemaListParser))
  }

  public async createCredentialDefinition(
    issuerId: string,
    schemaId: string,
    tag: string
  ): Promise<CredentialDefinition> {
    return this.postRequest(
      '/v1/credential-definitions',
      { tag, issuerId, schemaId },
      this.buildParser(credentialDefinitionParser)
    )
  }

  public async getCreatedCredentialDefinitions(
    filters: Partial<{ schemaId: string; issuerId: string }> = {}
  ): Promise<CredentialDefinition[]> {
    const params = new URLSearchParams({
      createdLocally: 'true',
      ...filters,
    }).toString()

    return this.getRequest(`/v1/credential-definitions?${params}`, this.buildParser(credentialDefinitionListParser))
  }

  private async getRequest<O>(path: string, parse: parserFn<O>): Promise<O> {
    return this.noBodyRequest('GET', path, parse)
  }

  private async deleteRequest<O>(path: string, parse: parserFn<O>): Promise<O> {
    return this.noBodyRequest('DELETE', path, parse)
  }

  private async noBodyRequest<O>(method: 'GET' | 'DELETE', path: string, parse: parserFn<O>): Promise<O> {
    const url = `${this.env.get('CLOUDAGENT_ADMIN_ORIGIN')}${path}`

    const response = await fetch(url, {
      method,
    })

    if (!response.ok) {
      throw new InternalError(`Unexpected error calling GET ${path}: ${response.statusText}`)
    }

    try {
      return await parse(response)
    } catch (err) {
      if (err instanceof Error) {
        throw new InternalError(`Error parsing response from calling GET ${path}: ${err.name} - ${err.message}`)
      }
      throw new InternalError(`Unknown error parsing response to calling GET ${path}`)
    }
  }

  private async postRequest<O>(path: string, body: Record<string, unknown>, parse: parserFn<O>): Promise<O> {
    return this.bodyRequest('POST', path, body, parse)
  }

  private async bodyRequest<O>(
    method: 'POST' | 'PUT',
    path: string,
    body: Record<string, unknown>,
    parse: parserFn<O>
  ): Promise<O> {
    const url = `${this.env.get('CLOUDAGENT_ADMIN_ORIGIN')}${path}`

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new InternalError(`Unexpected error calling POST ${path}: ${response.statusText}`)
    }

    try {
      return await parse(response)
    } catch (err) {
      if (err instanceof Error) {
        throw new InternalError(`Error parsing response from calling POST ${path}: ${err.name} - ${err.message}`)
      }
      throw new InternalError(`Unknown error parsing response to calling POST ${path}`)
    }
  }

  private buildParser =
    <I, O>(parser: z.ZodType<O, z.ZodTypeDef, I>) =>
    async (response: Response) => {
      const asJson = await response.json()
      return parser.parse(asJson)
    }
}
