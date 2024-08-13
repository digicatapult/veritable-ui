import { EventEmitter } from 'node:events'
import { pino } from 'pino'
import sinon from 'sinon'

import { ILogger } from '../../../logger.js'
import Database from '../../../models/db/index.js'
import { ConnectionRow, QueryRow } from '../../../models/db/types.js'
import VeritableCloudagent from '../../../models/veritableCloudagent.js'
import VeritableCloudagentEvents from '../../veritableCloudagentEvents.js'
type QueryMockOptions = {
  getRows: {
    connection: Partial<ConnectionRow>[]
    query: Partial<QueryRow>[]
  }
}
const defaultOptions: QueryMockOptions = {
  getRows: {
    connection: [{ id: 'connection-id' }],
    query: [{ id: 'query-id' }],
  },
}

export const withDrpcEventMocks = (testOptions: Partial<QueryMockOptions> = {}) => {
  const options = {
    ...defaultOptions,
    ...testOptions,
  }
  const eventsMock = new EventEmitter()
  const cloudagentMock = {
    submitDrpcResponse: sinon.stub().resolves(),
  }
  const dbMock = {
    get: sinon.stub().callsFake((tableName: 'connection' | 'query') => Promise.resolve(options.getRows[tableName])),
    // get: sinon.stub().resolves([{ id: 'connection-id' }]),
    insert: sinon.stub().resolves([{ id: 'query-id' }]),
    update: sinon.stub().resolves([{ id: 'query-id' }]),
  }
  const logger = pino({ level: 'silent' }) as ILogger

  return {
    eventsMock,
    cloudagentMock,
    dbMock,
    logger,
    args: [
      eventsMock as VeritableCloudagentEvents,
      cloudagentMock as unknown as VeritableCloudagent,
      dbMock as unknown as Database,
      logger,
    ] as const,
  }
}
