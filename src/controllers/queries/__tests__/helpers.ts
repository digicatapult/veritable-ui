import { Readable } from 'node:stream'
import { pino } from 'pino'
import { ILogger } from '../../../logger.js'
import Database from '../../../models/db/index.js'
import { ConnectionRow } from '../../../models/db/types.js'
import QueriesTemplates from '../../../views/queries/queries.js'
import QueryListTemplates from '../../../views/queries/queriesList.js'
import Scope3CarbonConsumptionTemplates from '../../../views/queryTypes/scope3.js'

type QueryStatus = 'resolved' | 'pending_your_input' | 'pending_their_input'

interface Query {
  company_name: string
  query_type: string
  updated_at: Date
  status: QueryStatus
}

//this is not the most elegant way to have the sample data
//(it is being poppped from the end every time a get is called on a db)
const sampleArray = [
  [{ company_name: 'VER123', status: 'pending', id: '11' }],
  [{ company_name: 'VER123', status: 'pending', id: '11' }],
  [{ id: 'x', status: 'xx', connection_id: '11' }],
  [{ company_name: 'VER123', status: 'pending', id: '11' }],
  [{ id: 'x', status: 'xx', connection_id: '11' }],
  [{ company_name: 'bar', status: 'pending', id: '11' }],
]
function templateFake(templateName: string) {
  return Promise.resolve(`${templateName}_template`)
}
function templateListFake(templateName: string, ...args: any[]) {
  return Promise.resolve([templateName, args.join('-'), templateName].join('_'))
}
export const withQueriesMocks = () => {
  const scope3CarbonConsumptionTemplateMock = {
    newScope3CarbonConsumptionFormPage: (
      formStage: 'companySelect',
      connections: ConnectionRow[],
      search = '',
      company: { companyName: string; companyNumber: string }
    ) => templateFake(connections[0].company_name),
  } as Scope3CarbonConsumptionTemplates
  const queryTemplateMock = {
    chooseQueryPage: () => templateFake('queries'),
  } as QueriesTemplates
  const queryListTemplateMock = {
    listPage: (queries: Query[]) => templateListFake('list', queries[0].company_name, queries[0].status),
  } as QueryListTemplates
  const mockLogger: ILogger = pino({ level: 'silent' })
  const dbMock = {
    get: () => Promise.resolve(sampleArray.pop()),
  } as unknown as Database

  return {
    scope3CarbonConsumptionTemplateMock,
    queryListTemplateMock,
    queryTemplateMock,
    mockLogger,
    dbMock,
  }
}

export const toHTMLString = async (stream: Readable) => {
  const chunks: Uint8Array[] = []
  for await (const chunk of stream) {
    chunks.push(chunk as Uint8Array)
  }
  return Buffer.concat(chunks).toString('utf8')
}
