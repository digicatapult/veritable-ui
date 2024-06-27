import { Readable } from 'node:stream'
import { pino } from 'pino'
import { ILogger } from '../../../logger.js'
import QueriesTemplates from '../../../views/queries.js'

function templateFake(templateName: string) {
  return Promise.resolve(`${templateName}_template`)
}
export const withQueriesMocks = () => {
  const templateMock = {
    chooseQueryPage: () => templateFake('queries'),
  } as QueriesTemplates
  const mockLogger: ILogger = pino({ level: 'silent' })

  return {
    templateMock,
    mockLogger,
  }
}

export const toHTMLString = async (stream: Readable) => {
  const chunks: Uint8Array[] = []
  for await (const chunk of stream) {
    chunks.push(chunk as Uint8Array)
  }
  return Buffer.concat(chunks).toString('utf8')
}
