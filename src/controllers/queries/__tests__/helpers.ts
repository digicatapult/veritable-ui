import { Readable } from 'node:stream'
import { pino } from 'pino'
import { ILogger } from '../../../logger.js'
import Database from '../../../models/db/index.js'
import { QueryRow } from '../../../models/db/types.js'
import QueriesTemplates from '../../../views/queries.js'
import QueryListTemplates from '../../../views/queriesList.js'

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
    listPage: (queries: QueryRow[]) => templateListFake('list', queries[0].company_name, queries[0].status),
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
