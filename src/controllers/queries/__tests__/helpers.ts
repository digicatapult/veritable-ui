import { Readable } from 'node:stream'
import { pino } from 'pino'
import { ILogger } from '../../../logger.js'
import Database from '../../../models/db/index.js'
import { ConnectionRow } from '../../../models/db/types.js'
import QueriesTemplates from '../../../views/queries/queries.js'
import QueryListTemplates from '../../../views/queries/queriesList.js'
import Scope3CarbonConsumptionTemplates, { Scope3FormStage } from '../../../views/queryTypes/scope3.js'

type QueryStatus = 'resolved' | 'pending_your_input' | 'pending_their_input'

interface Query {
  company_name: string
  query_type: string
  updated_at: Date
  status: QueryStatus
}

function* sampleGenerator() {
  const samples = [
    [{ company_name: 'bar', status: 'pending', id: '11' }],
    [{ id: 'x', status: 'xx', connection_id: '11' }],
    [{ company_name: 'VER123', status: 'pending', id: '11' }],
    [{ id: 'x', status: 'xx', connection_id: '11' }],
    [{ company_name: 'VER123', status: 'pending', id: '11' }],
    [{ company_name: 'VER123', status: 'pending', id: '11' }],
    [{ company_name: 'VER123', status: 'pending', id: '11', company_number: '10000009' }],
  ]

  let index = 0
  while (index < samples.length) {
    yield samples[index++]
  }
}
const sampleGen = sampleGenerator()

function templateFake(templateName: string) {
  return Promise.resolve(`${templateName}_template`)
}
function templateListFake(templateName: string, ...args: any[]) {
  return Promise.resolve([templateName, args.join('-'), templateName].join('_'))
}
export const withQueriesMocks = (stage: Scope3FormStage = 'companySelect', compNumber: string = '10000009') => {
  const scope3CarbonConsumptionTemplateMock = {
    newScope3CarbonConsumptionFormPage: (
      formStage: Scope3FormStage = stage,
      connections: ConnectionRow[],
      search = '',
      company: { companyName: string; companyNumber: string } = { companyName: '', companyNumber: compNumber }
    ) => templateFake('queries'),
  } as Scope3CarbonConsumptionTemplates
  const queryTemplateMock = {
    chooseQueryPage: () => templateFake('queries'),
  } as QueriesTemplates
  const queryListTemplateMock = {
    listPage: (queries: Query[]) => templateListFake('list', queries[0].company_name, queries[0].status),
  } as QueryListTemplates
  const mockLogger: ILogger = pino({ level: 'silent' })
  const dbMock = {
    get: () => {
      const result = sampleGen.next()
      return Promise.resolve(result.value)
    },
    insert: () => {
      return Promise.resolve([
        {
          status: 'pending_their_input',
          id: 123,
          created_at: new Date(),
          updated_at: new Date(),
          connection_id: '11',
          query_type: 'Scope 3',
          details: 'some details',
        },
      ])
    },
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
