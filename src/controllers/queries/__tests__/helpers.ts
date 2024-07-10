import { Readable } from 'node:stream'
import { pino } from 'pino'
import { ILogger } from '../../../logger.js'
import Database from '../../../models/db/index.js'
import QueriesTemplates from '../../../views/queries/queries.js'
import QueryListTemplates from '../../../views/queries/queriesList.js'

type QueryStatus = 'resolved' | 'pending_your_input' | 'pending_their_input'

interface Query {
  company_name: string
  query_type: string
  updated_at: Date
  status: QueryStatus
}
function templateFake(templateName: string) {
  return Promise.resolve(`${templateName}_template`)
}
function templateListFake(templateName: string, ...args: any[]) {
  return Promise.resolve([templateName, args.join('-'), templateName].join('_'))
}
export const withQueriesMocks = () => {
  const queryTemplateMock = {
    chooseQueryPage: () => templateFake('queries'),
  } as QueriesTemplates
  const queryListTemplateMock = {
    listPage: (queries: Query[]) => templateListFake('list', queries[0].company_name, queries[0].status),
  } as QueryListTemplates
  const mockLogger: ILogger = pino({ level: 'silent' })
  const dbMock = {
    get: () => Promise.resolve([{ company_name: 'foo', status: 'verified' }]),
  } as unknown as Database

  return {
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
