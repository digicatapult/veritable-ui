import { z } from 'zod'

import { type PartialEnv } from '../../env/index.js'
import { BadRequestError, InternalError, NotFoundError } from '../../errors.js'
import { type ILogger } from '../../logger.js'
import { MapDiscriminatedUnion } from '../../utils/types.js'
import { DrpcQueryRequest, DrpcQueryResponse } from '../drpc.js'
import {
  type CountryCode,
  type CredentialDefinitionId,
  type DID,
  type SchemaId,
  type UUID,
  type Version,
} from '../stringTypes.js'

const oobParser = z.object({
  invitationUrl: z.url(),
  outOfBandRecord: z.object({ id: z.uuid() }),
})
type OutOfBandInvite = z.infer<typeof oobParser>

const oobInviteParser = z.object({
  id: z.uuid(),
  role: z.enum(['sender', 'receiver']),
})

type OutOfBandRecord = z.infer<typeof oobInviteParser>

const receiveUrlParser = z.object({
  outOfBandRecord: z.object({
    id: z.uuid(),
  }),
  connectionRecord: z.object({
    id: z.uuid(),
  }),
})
type ReceiveUrlResponse = z.infer<typeof receiveUrlParser>

export const connectionParser = z.object({
  id: z.uuid(),
  state: z.enum([
    'start',
    'invitation-sent',
    'invitation-received',
    'request-sent',
    'request-received',
    'response-sent',
    'response-received',
    'abandoned',
    'completed',
  ]),
  outOfBandId: z.uuid(),
})
export type Connection = z.infer<typeof connectionParser>

export const credentialAttributeParser = z.object({
  name: z.string(),
  value: z.string(),
})

export const didDocumentParser = z.object({
  id: z.string(),
})
export type DidDocument = z.infer<typeof didDocumentParser>

export const didCreateParser = z.object({
  didDocument: didDocumentParser,
})
export const didListParser = z.array(didCreateParser)

export const credentialSchemaParser = z.object({
  id: z.string(),
  issuerId: z.string(),
  name: z.string(),
  version: z.string(),
  attrNames: z.array(z.string()),
})
export type CredentialSchema = z.infer<typeof credentialSchemaParser>

export const credentialDefinitionParser = z.object({
  id: z.string(),
  issuerId: z.string(),
  schemaId: z.string(),
})
export type CredentialDefinition = z.infer<typeof credentialDefinitionParser>

export const credentialParser = z.object({
  id: z.uuid(),
  connectionId: z.uuid(),
  protocolVersion: z.string(),
  credentialAttributes: z.array(credentialAttributeParser).optional(),
  role: z.enum(['issuer', 'holder']),
  state: z.enum([
    'proposal-sent',
    'proposal-received',
    'offer-sent',
    'offer-received',
    'declined',
    'request-sent',
    'request-received',
    'credential-issued',
    'credential-received',
    'done',
    'abandoned',
  ]),
  errorMessage: z.string().optional(),
  metadata: z
    .object({
      '_anoncreds/credential': z
        .object({
          credentialDefinitionId: z.string().optional(),
          schemaId: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
})
export type Credential = z.infer<typeof credentialParser>

export const anoncredsFormatParser = z.object({
  anoncreds: z.object({
    schema_id: z.string().optional(),
    cred_def_id: z.string().optional(),
    schema_name: z.string().optional(),
    schema_version: z.string().optional(),
  }),
})

export const credentialFormatDataParser = z.object({
  proposalAttributes: z.array(credentialAttributeParser).optional(),
  offerAttributes: z.array(credentialAttributeParser).optional(),
  proposal: anoncredsFormatParser.optional(),
  offer: anoncredsFormatParser.optional(),
})
export type CredentialFormatData = z.infer<typeof credentialFormatDataParser>

const responseCommonParser = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.uuid(),
})
export const jsonRpcError = z.object({
  code: z.number(),
  message: z.string(),
})
export const drpcResponseParser = z.union([
  z
    .object({
      result: z.looseObject({}),
    })
    .extend(responseCommonParser.shape),
  z
    .object({
      error: jsonRpcError,
    })
    .extend(responseCommonParser.shape),
])
export type JsonRpcError = z.infer<typeof jsonRpcError>
export type DrpcResponse = z.infer<typeof drpcResponseParser>

const connectionListParser = z.array(connectionParser)
const credentialListParser = z.array(credentialParser)
const outOfBandListParser = z.array(oobInviteParser)
const schemaListParser = z.array(credentialSchemaParser)
const credentialDefinitionListParser = z.array(credentialDefinitionParser)

export type CredentialProposalInput = {
  schemaIssuerId?: DID
  schemaId?: SchemaId
  schemaName?: string
  schemaVersion?: Version
  credentialDefinitionId?: CredentialDefinitionId
  issuerId?: DID
  attributes?: {
    name: string
    value: string
  }[]
}
export type CredentialProposalAcceptInput = {
  credentialDefinitionId?: CredentialDefinitionId
  attributes?: {
    name: string
    value: string
  }[]
}

type parserFn<O> = (res: Response) => O | Promise<O>

export interface DrpcRequest {
  method: string
  params: Record<string, unknown>
}

export interface CloudagentConfig {
  drpcRequest: DrpcRequest
  drpcResponseResult: unknown
}

export type DefaultConfig = {
  drpcRequest: DrpcQueryRequest
  drpcResponseResult: DrpcQueryResponse
}

/*
  This is in internal class which implements the cloudagent without dependency injection. Can be used in e2e tests
*/
export default class VeritableCloudagentInt<Config extends CloudagentConfig = DefaultConfig> {
  constructor(
    private env: PartialEnv<'CLOUDAGENT_ADMIN_ORIGIN'>,
    protected logger: ILogger
  ) {}

  /*----------------------- Out of Band Invitations ---------------------------*/

  public async getOutOfBandInvite(id: UUID): Promise<OutOfBandRecord> {
    return this.getRequest(`/v1/oob/${id}`, this.buildParser(oobInviteParser))
  }

  // Parser and method only used in reset controller
  public async getOutOfBandInvites(): Promise<OutOfBandRecord[]> {
    return this.getRequest(`/v1/oob/`, this.buildParser(outOfBandListParser))
  }

  public async createOutOfBandInvite(params: {
    companyName: string
    registryCountryCode: CountryCode
  }): Promise<OutOfBandInvite> {
    return this.postRequest(
      '/v1/oob/create-invitation',
      {
        alias: params.companyName,
        goalCode: params.registryCountryCode,
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

  public async deleteOutOfBandInvite(id: UUID): Promise<void> {
    return this.deleteRequest(`/v1/oob/${id}`, () => {})
  }

  /*----------------------- Connections ---------------------------------*/

  public async getConnections(): Promise<Connection[]> {
    return this.getRequest('/v1/connections', this.buildParser(connectionListParser))
  }

  public async deleteConnection(id: UUID): Promise<void> {
    return this.deleteRequest(`/v1/connections/${id}`, () => {})
  }

  /*----------------------- Credentials ---------------------------------*/

  public async getCredentials(): Promise<Credential[]> {
    return this.getRequest('/v1/credentials', this.buildParser(credentialListParser))
  }

  public async proposeCredential(connectionId: UUID, proposal: CredentialProposalInput): Promise<Credential> {
    const body = {
      protocolVersion: 'v2',
      credentialFormats: {
        anoncreds: {
          ...proposal,
        },
      },
      connectionId,
    }
    return this.postRequest('/v1/credentials/propose-credential', body, this.buildParser(credentialParser))
  }

  public async acceptProposal(credentialId: UUID, proposal: CredentialProposalAcceptInput): Promise<Credential> {
    const body = {
      credentialFormats: {
        anoncreds: {
          ...proposal,
        },
      },
    }
    return this.postRequest(`/v1/credentials/${credentialId}/accept-proposal`, body, this.buildParser(credentialParser))
  }

  public async acceptCredentialOffer(credentialId: UUID): Promise<Credential> {
    return this.postRequest(`/v1/credentials/${credentialId}/accept-offer`, {}, this.buildParser(credentialParser))
  }

  public async acceptCredentialRequest(credentialId: UUID): Promise<Credential> {
    return this.postRequest(`/v1/credentials/${credentialId}/accept-request`, {}, this.buildParser(credentialParser))
  }

  public async acceptCredential(credentialId: UUID): Promise<Credential> {
    return this.postRequest(`/v1/credentials/${credentialId}/accept-credential`, {}, this.buildParser(credentialParser))
  }

  public async createCredentialDefinition(
    issuerId: DID,
    schemaId: SchemaId,
    tag: string
  ): Promise<CredentialDefinition> {
    return this.postRequest(
      '/v1/credential-definitions',
      { tag, issuerId, schemaId },
      this.buildParser(credentialDefinitionParser)
    )
  }

  public async getCreatedCredentialDefinitions(
    filters: Partial<{ schemaId: SchemaId; issuerId: DID }> = {}
  ): Promise<CredentialDefinition[]> {
    const params = new URLSearchParams({
      createdLocally: 'true',
      ...filters,
    }).toString()

    return this.getRequest(`/v1/credential-definitions?${params}`, this.buildParser(credentialDefinitionListParser))
  }

  public async getCredentialDefinitionById(
    credentialDefinitionId: CredentialDefinitionId
  ): Promise<CredentialDefinition> {
    return this.getRequest(
      `/v1/credential-definitions/${encodeURIComponent(credentialDefinitionId)}`,
      this.buildParser(credentialDefinitionParser)
    )
  }

  public async getCredentialFormatData(credentialId: UUID): Promise<CredentialFormatData> {
    return this.getRequest(`/v1/credentials/${credentialId}/format-data`, this.buildParser(credentialFormatDataParser))
  }

  public async deleteCredential(id: UUID): Promise<void> {
    return this.deleteRequest(`/v1/credentials/${id}`, () => {})
  }

  public async sendProblemReport(credentialId: UUID, description: string): Promise<Credential> {
    return this.postRequest(
      `/v1/credentials/${credentialId}/send-problem-report`,
      { description: description },
      this.buildParser(credentialParser)
    )
  }

  /*----------------------- Schemas ---------------------------------*/

  public async createSchema(
    issuerId: DID,
    name: string,
    version: Version,
    attrNames: string[]
  ): Promise<CredentialSchema> {
    return this.postRequest(
      '/v1/schemas',
      { issuerId, name, version, attrNames },
      this.buildParser(credentialSchemaParser)
    )
  }

  public async getCreatedSchemas(
    filters: Partial<{ issuerId: DID; schemaName: string; schemaVersion: Version }> = {}
  ): Promise<CredentialSchema[]> {
    const params = new URLSearchParams({
      createdLocally: 'true',
      ...filters,
    }).toString()

    return this.getRequest(`/v1/schemas?${params}`, this.buildParser(schemaListParser))
  }

  public async getSchemaById(schemaId: SchemaId): Promise<CredentialSchema> {
    return this.getRequest(`/v1/schemas/${encodeURIComponent(schemaId)}`, this.buildParser(credentialSchemaParser))
  }

  /*---------------------------- DIDs ---------------------------------*/

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

  /*---------------------------- DRPC ---------------------------------*/

  public async submitDrpcRequest<M extends Config['drpcRequest']['method']>(
    connectionId: UUID,
    method: M,
    params: MapDiscriminatedUnion<Config['drpcRequest'], 'method'>[M]['params']
  ): Promise<DrpcResponse | undefined> {
    const body = {
      jsonrpc: '2.0',
      method,
      params,
    }

    const parser = this.buildParser(drpcResponseParser)
    return this.postRequest(`/v1/drpc/${connectionId}/request`, body, (response) => {
      if (response.status === 204) {
        return undefined
      }
      return parser(response)
    })
  }

  public async submitDrpcResponse(
    requestId: UUID,
    response: { result?: Config['drpcResponseResult']; error?: JsonRpcError }
  ): Promise<void> {
    return this.postRequest(
      `/v1/drpc/${requestId}/response`,
      {
        jsonrpc: '2.0',
        ...response,
      },
      () => {}
    )
  }

  /*--------------------------- Shared Methods ---------------------------------*/

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
      if (response.status === 400) {
        throw new BadRequestError(`${path}`)
      }
      if (response.status === 404) {
        throw new NotFoundError(`${path}`)
      }
      throw new InternalError(`Unexpected error calling ${method} ${path}: ${response.statusText}`)
    }

    try {
      return await parse(response)
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`Error parsing response from calling ${method} ${path}: ${err.name} - ${err.message}`)
      }
      throw new InternalError(`Unknown error parsing response to calling ${method} ${path}`)
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
      throw new InternalError(`Unexpected error calling ${method} ${path}: ${response.statusText}`)
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
    <O>(parser: z.ZodType<O>) =>
    async (response: Response) => {
      const asJson = await response.json()
      return parser.parse(asJson)
    }
}
