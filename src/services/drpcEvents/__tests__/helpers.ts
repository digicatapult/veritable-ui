import { EventEmitter } from 'node:events'
import { pino } from 'pino'
import sinon from 'sinon'

import { ILogger } from '../../../logger.js'
import Database from '../../../models/db/index.js'
import { ConnectionRow, QueryRow } from '../../../models/db/types.js'
import VeritableCloudagent from '../../../models/veritableCloudagent/index.js'
import VeritableCloudagentEvents from '../../veritableCloudagentEvents.js'
type QueryMockOptions = {
  getRows: {
    connection: Partial<ConnectionRow>[]
    query: Partial<QueryRow>[]
  }
}
export const defaultOptions: QueryMockOptions = {
  getRows: {
    connection: [{ id: 'connection-id', agent_connection_id: 'agent_connection_id' }],
    query: [{ id: 'query-id', response: null }],
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
    submitDrpcRequest: sinon.stub().resolves({
      id: 'drpc-id',
      result: {},
    }),
  }
  const dbMock = {
    get: sinon.stub().callsFake((tableName: 'connection' | 'query') => Promise.resolve(options.getRows[tableName])),
    insert: sinon.stub().callsFake((name, details) => {
      return Promise.resolve([{ id: `${name}-id`, ...details }])
    }),
    update: sinon.stub().callsFake((name, details) => {
      return Promise.resolve([{ id: `${name}-id`, ...details }])
    }),
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
