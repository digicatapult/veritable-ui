import { pino } from 'pino'
import sinon from 'sinon'

import argon2 from 'argon2'
import { EventEmitter } from 'events'
import { Env } from '../../../../env.js'
import { ILogger } from '../../../../logger.js'
import { CredentialSchema } from '../../../../models/credentialSchema.js'
import Database from '../../../../models/db/index.js'
import VeritableCloudagent from '../../../../models/veritableCloudagent.js'
import VeritableCloudagentEvents from '../../../veritableCloudagentEvents.js'
import CompanyDetailsV1Handler from '../../companyDetailsV1.js'

const defaultCredEventsOptions = {
  formatDataResponse: {
    proposal: {
      anoncreds: { schema_name: 'COMPANY_DETAILS', schema_version: '1.0.0' },
    },
    offer: {
      anoncreds: { schema_id: 'SCHEMA' },
    },
  } as unknown,
  schemaResponse: {
    name: 'COMPANY_DETAILS',
    version: '1.0.0',
  } as unknown,
}

export const withCredentialEventsDepsMock = (opts: Partial<typeof defaultCredEventsOptions>) => {
  const options = {
    ...defaultCredEventsOptions,
    ...opts,
  }

  const loggerMock = pino({ level: 'silent' }) as ILogger
  const companyDetailsMock = {
    schemaName: 'COMPANY_DETAILS',
    schemaVersion: '1.0.0',
    handleProposalReceived: sinon.stub().resolves(),
    handleOfferReceived: sinon.stub().resolves(),
    handleRequestReceived: sinon.stub().resolves(),
    handleCredentialReceived: sinon.stub().resolves(),
    handleDone: sinon.stub().resolves(),
  }
  const cloudagentMock = {
    getCredentialFormatData: sinon.stub().resolves(options.formatDataResponse),
    getSchemaById: sinon.stub().resolves(options.schemaResponse),
  }
  const eventMock = new EventEmitter()

  return {
    loggerMock,
    companyDetailsMock,
    cloudagentMock,
    eventMock,
    formatData: options.formatDataResponse,
    schema: options.schemaResponse,
    args: [
      eventMock as VeritableCloudagentEvents,
      cloudagentMock as unknown as VeritableCloudagent,
      companyDetailsMock as unknown as CompanyDetailsV1Handler,
      loggerMock,
    ] as const,
  }
}

export const invitePinSecret = Buffer.from('secret', 'utf8')
const defaultCompanyDetailsOptions = {
  dbGetConnection: [
    {
      status: 'unverified',
      id: 'connection-id',
      company_name: 'NAME',
      company_number: 'NUMBER',
    },
  ] as unknown,
  dbGetConnectionInvites: [
    {
      pin_hash: await argon2.hash('123456', { secret: invitePinSecret }),
      expires_at: new Date(10), // needs to be in the future
    },
  ] as unknown,
  dbIncrement: [
    {
      pin_attempt_count: 1,
    },
  ] as unknown,
}

export const withCompanyDetailsDepsMock = (opts: Partial<typeof defaultCompanyDetailsOptions>) => {
  const options = {
    ...defaultCompanyDetailsOptions,
    ...opts,
  }

  const envMock = {
    get: sinon.stub().callsFake((name: 'INVITATION_PIN_SECRET' | 'INVITATION_PIN_ATTEMPT_LIMIT') => {
      switch (name) {
        case 'INVITATION_PIN_SECRET':
          return invitePinSecret
        case 'INVITATION_PIN_ATTEMPT_LIMIT':
          return 5
      }
    }),
  } as unknown as Env
  const dbTransactionMock = {
    get: sinon.stub().resolves(options.dbGetConnection),
    update: sinon.stub().resolves(),
  }
  const dbMock = {
    get: sinon.stub().callsFake((table: string) => {
      if (table === 'connection') return Promise.resolve(options.dbGetConnection)
      else if (table === 'connection_invite') return Promise.resolve(options.dbGetConnectionInvites)
      else throw new Error('bad db call')
    }),
    increment: sinon.stub().resolves(options.dbIncrement),
    update: sinon.stub().resolves(),
    withTransaction: sinon.stub().callsFake(async (handler: (db: Database) => Promise<void>): Promise<void> => {
      await handler(dbTransactionMock as unknown as Database)
    }),
  }
  const cloudagentMock = {
    acceptProposal: sinon.stub().resolves(),
    acceptCredentialOffer: sinon.stub().resolves(),
    acceptCredentialRequest: sinon.stub().resolves(),
    acceptCredential: sinon.stub().resolves(),
  }
  const schemaMock = {
    issuanceRecords: {
      credentialDefinitionId: {
        COMPANY_DETAILS: 'credential-definition-id',
      },
    },
  }
  const mockLogger = pino({ level: 'silent' }) as ILogger

  return {
    envMock,
    dbTransactionMock,
    dbMock,
    cloudagentMock,
    schemaMock,
    mockLogger,
    args: [
      envMock as Env,
      dbMock as unknown as Database,
      cloudagentMock as unknown as VeritableCloudagent,
      schemaMock as unknown as CredentialSchema,
      mockLogger,
    ] as const,
  }
}
