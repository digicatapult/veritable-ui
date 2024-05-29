import { Readable } from 'node:stream'

import pino from 'pino'

import Database from '../../../models/db/index.js'
import { ConnectionRow } from '../../../models/db/types.js'
import ConnectionTemplates from '../../../views/connection.js'

export const withMocks = () => {
  const templateMock = {
    listPage: (connections: ConnectionRow[]) =>
      `list_${connections.map((c) => `${c.company_name}-${c.status}`).join('_')}_list`,
  } as ConnectionTemplates
  const mockLogger = pino.default({ level: 'silent' })
  const dbMock = {
    get: () => Promise.resolve([{ company_name: 'foo', status: 'verified' }]),
  } as unknown as Database

  return {
    templateMock,
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
