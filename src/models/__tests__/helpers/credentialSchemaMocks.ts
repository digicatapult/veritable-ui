import { pino } from 'pino'
import sinon from 'sinon'

import { Env } from '../../../env/index.js'
import { ILogger } from '../../../logger.js'
import VeritableCloudagent from '../../veritableCloudagent/index.js'
import {
  createCredentialDefinitionResponse,
  createDidResponse,
  createSchemaResponse,
} from '../fixtures/cloudagentFixtures.js'

type MockOptions = {
  hasDids: boolean
  hasSchema: boolean
  hasCredDef: boolean
  didPolicy: string
  schemaPolicy: string
  credDefPolicy: string
}
const defaultMockOptions: MockOptions = {
  hasDids: true,
  hasSchema: true,
  hasCredDef: true,
  didPolicy: 'FIND_EXISTING',
  schemaPolicy: 'FIND_EXISTING',
  credDefPolicy: 'FIND_EXISTING',
}

export const makeCredentialSchemaMocks = (options: Partial<MockOptions>) => {
  const mergedOptions = Object.assign({}, defaultMockOptions, options)

  const mockLogger: ILogger = pino({ level: 'silent' })
  const mockEnv = {
    get: (name: string) => {
      switch (name) {
        case 'ISSUANCE_DID_POLICY':
          return mergedOptions.didPolicy
        case 'ISSUANCE_SCHEMA_POLICY':
          return mergedOptions.schemaPolicy
        case 'ISSUANCE_CRED_DEF_POLICY':
          return mergedOptions.credDefPolicy
        default:
          throw new Error()
      }
    },
  } as unknown as Env
  const mockCloudagent = {
    getCreatedDids: sinon.stub().resolves(mergedOptions.hasDids ? [createDidResponse.didDocument] : []),
    createDid: sinon.stub().resolves(createDidResponse.didDocument),
    getCreatedSchemas: sinon.stub().resolves(mergedOptions.hasSchema ? [createSchemaResponse] : []),
    createSchema: sinon.stub().resolves(createSchemaResponse),
    getCreatedCredentialDefinitions: sinon
      .stub()
      .resolves(mergedOptions.hasCredDef ? [createCredentialDefinitionResponse] : []),
    createCredentialDefinition: sinon.stub().resolves(createCredentialDefinitionResponse),
  }

  return {
    mockEnv,
    mockLogger,
    mockCloudagent,
    args: [mockEnv, mockLogger, mockCloudagent as unknown as VeritableCloudagent] as const,
  }
}
