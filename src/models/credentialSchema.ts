import { inject, injectable, singleton } from 'tsyringe'
import { Env, type PartialEnv } from '../env/index.js'
import { Logger, type ILogger } from '../logger.js'
import VeritableCloudagent from './veritableCloudagent/index.js'

export const schemaMap = {
  COMPANY_DETAILS: { version: '1.0.0', attrNames: ['company_number', 'company_name'] },
  COMPANY_DETAILS: { version: '1.0.0', attrNames: ['company_number', 'company_name'] },
  COMPANY_DETAILS: { version: '1.0.0', attrNames: ['company_number', 'company_name'] },
  COMPANY_DETAILS: { version: '1.0.0', attrNames: ['company_number', 'company_name'] },
} as const

type SCHEMA_NAMES = keyof typeof schemaMap

@singleton()
@injectable()
export class CredentialSchema {
  private issuerId?: string
  private schemaId?: Record<SCHEMA_NAMES, string>
  private credentialDefinitionId?: Record<SCHEMA_NAMES, string>

  constructor(
    @inject(Env) private env: PartialEnv<'ISSUANCE_DID_POLICY' | 'ISSUANCE_SCHEMA_POLICY' | 'ISSUANCE_CRED_DEF_POLICY'>,
    @inject(Logger) private logger: ILogger,
    private cloudagent: VeritableCloudagent
  ) {}

  private async assertDid(): Promise<string> {
    if (this.issuerId) {
      return this.issuerId
    }

    const policy = this.env.get('ISSUANCE_DID_POLICY')
    if (policy !== 'CREATE_NEW' && policy !== 'FIND_EXISTING' && policy !== 'EXISTING_OR_NEW') {
      return policy
    }

    if (policy === 'FIND_EXISTING' || policy === 'EXISTING_OR_NEW') {
      const createdDids = await this.cloudagent.getCreatedDids({ method: 'key' })
      if (createdDids.length !== 0) {
        return createdDids[0].id
      }
    }

    if (policy === 'CREATE_NEW' || policy === 'EXISTING_OR_NEW') {
      const result = await this.cloudagent.createDid('key', { keyType: 'ed25519' })
      return result.id
    }

    throw new Error('Could not find existing DiD to use for issuing credentials')
  }

  private async assertSchema(issuerId: string, schemaName: SCHEMA_NAMES): Promise<string> {
    if (this.schemaId) {
      return this.schemaId[schemaName]
    }

    const policy = this.env.get('ISSUANCE_SCHEMA_POLICY')
    if (policy !== 'CREATE_NEW' && policy !== 'FIND_EXISTING' && policy !== 'EXISTING_OR_NEW') {
      return policy
    }

    const expectedSchema = {
      issuerId,
      name: schemaName,
      version: schemaMap[schemaName].version,
      attrNames: schemaMap[schemaName].attrNames,
    }

    if (policy === 'EXISTING_OR_NEW' || policy === 'FIND_EXISTING') {
      const findSchema = await this.cloudagent.getCreatedSchemas({
        issuerId,
        schemaName: expectedSchema.name,
        schemaVersion: expectedSchema.version,
      })
      if (findSchema.length !== 0) {
        return findSchema[0].id
      }
    }

    if (policy === 'CREATE_NEW' || policy === 'EXISTING_OR_NEW') {
      const result = await this.cloudagent.createSchema(
        expectedSchema.issuerId,
        expectedSchema.name,
        expectedSchema.version,
        [...expectedSchema.attrNames]
      )
      return result.id
    }

    throw new Error(`Could not assert schema that matched schema policy ${policy}`)
  }

  private async assertCredentialDefinition(
    issuerId: string,
    schemaId: string,
    schemaName: SCHEMA_NAMES
  ): Promise<string> {
    if (this.credentialDefinitionId) {
      return this.credentialDefinitionId[schemaName]
    }

    const policy = this.env.get('ISSUANCE_CRED_DEF_POLICY')
    if (policy !== 'CREATE_NEW' && policy !== 'FIND_EXISTING' && policy !== 'EXISTING_OR_NEW') {
      return policy
    }

    if (policy === 'EXISTING_OR_NEW' || policy === 'FIND_EXISTING') {
      const findCredDef = await this.cloudagent.getCreatedCredentialDefinitions({ schemaId, issuerId })
      if (findCredDef.length !== 0) {
        return findCredDef[0].id
      }
    }

    if (policy === 'CREATE_NEW' || policy === 'EXISTING_OR_NEW') {
      const result = await this.cloudagent.createCredentialDefinition(issuerId, schemaId, 'company_details_v1.0.0')
      return result.id
    }

    throw new Error(`Could not assert credential definition that matched schema policy ${policy}`)
  }

  public async assertIssuanceRecords() {
    const issuerId = await this.assertDid()
    this.issuerId = issuerId

    const schemaId = await this.assertSchema(issuerId, 'COMPANY_DETAILS')
    this.schemaId = { COMPANY_DETAILS: schemaId }

    const credentialDefinitionId = await this.assertCredentialDefinition(issuerId, schemaId, 'COMPANY_DETAILS')
    this.credentialDefinitionId = { COMPANY_DETAILS: credentialDefinitionId }

    const records = this.issuanceRecords
    this.logger.info(
      records,
      'For issuing credentials using:\n\tissuerId:\t%s\n\tschemaId:\t%s\n\tcred-def:\t%s',
      records.issuerId,
      records.schemaId.COMPANY_DETAILS,
      records.credentialDefinitionId.COMPANY_DETAILS
    )

    return records
  }

  get issuanceRecords() {
    if (!this.issuerId || !this.schemaId || !this.credentialDefinitionId) {
      throw new Error('Credential Schema records have not been initialised')
    }
    return { issuerId: this.issuerId, schemaId: this.schemaId, credentialDefinitionId: this.credentialDefinitionId }
  }
}
