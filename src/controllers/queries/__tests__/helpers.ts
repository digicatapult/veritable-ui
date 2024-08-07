import { Readable } from 'node:stream'
import { pino } from 'pino'
import sinon from 'sinon'
import { ILogger } from '../../../logger.js'
import Database from '../../../models/db/index.js'
import { ConnectionRow, QueryRow } from '../../../models/db/types.js'
import VeritableCloudagent from '../../../models/veritableCloudagent.js'
import QueriesTemplates from '../../../views/queries/queries.js'
import QueryListTemplates from '../../../views/queries/queriesList.js'
import Scope3CarbonConsumptionResponseTemplates from '../../../views/queries/queryResponses/scope3.js'
import Scope3CarbonConsumptionTemplates from '../../../views/queryTypes/scope3.js'

type QueryStatus = 'resolved' | 'pending_your_input' | 'pending_their_input'

interface Query {
  company_name: string
  query_type: string
  updated_at: Date
  status: QueryStatus
}

type QueryMockOptions = {
  getRows: {
    connection: Partial<ConnectionRow>[]
    query: Partial<QueryRow>[]
  }
}
const defaultOptions: QueryMockOptions = {
  getRows: {
    connection: [{ company_name: 'VER123', status: 'verified_both', id: '11', agent_connection_id: 'agentId' }],
    query: [{ id: 'x', status: 'pending_their_input', connection_id: '11' }],
  },
}

function templateFake(templateName: string) {
  return Promise.resolve(`${templateName}_template`)
}
function templateListFake(templateName: string, ...args: any[]) {
  return Promise.resolve([templateName, args.join('-'), templateName].join('_'))
}
export const withQueriesMocks = (testOptions: Partial<QueryMockOptions> = {}) => {
  const options = {
    ...defaultOptions,
    ...testOptions,
  }

  const scope3CarbonConsumptionTemplateMock = {
    newScope3CarbonConsumptionFormPage: (props: { formStage: string }) => templateListFake('scope3', props.formStage),
  } as unknown as Scope3CarbonConsumptionTemplates

  const scope3CarbonConsumptionResponseTemplateMock = {
    newScope3CarbonConsumptionResponseFormPage: () => templateFake('queriesResponse'),
  } as unknown as Scope3CarbonConsumptionResponseTemplates
  const queryTemplateMock = {
    chooseQueryPage: () => templateFake('queries'),
  } as QueriesTemplates
  const cloudagentMock = {
    submitDrpcRequest: sinon.stub().resolves({
      result: 'result',
      id: 'request-id',
    }),
  }
  const queryListTemplateMock = {
    listPage: (queries: Query[]) => templateListFake('list', queries[0].company_name, queries[0].status),
  } as unknown as QueryListTemplates
  const mockLogger: ILogger = pino({ level: 'silent' })
  const dbMock = {
    get: sinon.stub().callsFake((tableName: 'connection' | 'query') => Promise.resolve(options.getRows[tableName])),
    update: sinon.stub().resolves(),
    insert: sinon.stub().resolves([
      {
        status: 'pending_their_input',
        id: 123,
        created_at: new Date(),
        updated_at: new Date(),
        connection_id: '11',
        query_type: 'Scope 3',
        details: 'some details',
      },
    ]),
  }

  return {
    scope3CarbonConsumptionTemplateMock,
    scope3CarbonConsumptionResponseTemplateMock,
    queryListTemplateMock,
    queryTemplateMock,
    mockLogger,
    dbMock,
    cloudagentMock,
    args: [
      scope3CarbonConsumptionTemplateMock,
      queryTemplateMock,
      queryListTemplateMock,
      cloudagentMock as unknown as VeritableCloudagent,
      dbMock as unknown as Database,
      mockLogger,
    ] as const,
  }
}

export const toHTMLString = async (stream: Readable) => {
  const chunks: Uint8Array[] = []
  for await (const chunk of stream) {
    chunks.push(chunk as Uint8Array)
  }
  return Buffer.concat(chunks).toString('utf8')
}
