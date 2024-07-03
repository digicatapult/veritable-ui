import { pino } from 'pino'
import sinon from 'sinon'

import { EventEmitter } from 'events'
import { ILogger } from '../../../../logger.js'
import VeritableCloudagent from '../../../../models/veritableCloudagent.js'
import VeritableCloudagentEvents from '../../../veritableCloudagentEvents.js'
import CompanyDetailsV1Handler from '../../companyDetailsV1.js'

const defaultOptions = {
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

export const withMockedDependencies = (opts: Partial<typeof defaultOptions>) => {
  // private events: VeritableCloudagentEvents,
  //   private cloudagent: VeritableCloudagent,
  //   private companyDetailsHandler: CompanyDetailsV1Handler,
  //   @inject(Logger) protected logger: ILogger

  const options = {
    ...defaultOptions,
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
