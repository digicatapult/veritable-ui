import { pino } from 'pino'

import type { ILogger } from '../../../logger.js'

export const createInviteSuccessResponse = {
  invitationUrl: 'example.com',
  outOfBandRecord: { id: 'example-id' },
}

export const receiveInviteSuccessResponse = {
  outOfBandRecord: {
    id: 'oob-id',
  },
  connectionRecord: {
    id: 'connection-id',
  },
}

export const getConnectionsSuccessResponse = [
  {
    id: 'connection-id',
    state: 'completed',
    outOfBandId: 'oob-id',
  },
]

export const createDidResponse = {
  didDocument: {
    id: 'did-id',
  },
}

export const createSchemaResponse = {
  id: 'id',
  issuerId: 'issuerId',
  name: 'name',
  version: 'version',
  attrNames: ['attrName'],
}

export const createCredentialDefinitionResponse = {
  id: 'id',
  issuerId: 'issuerId',
  schemaId: 'schemaId',
}

export const invalidResponse = {}

export const drpcRequestResponse = {
  jsonrpc: '2.0',
  result: 'result',
  id: 'request-id',
}

export const mockLogger: ILogger = pino({ level: 'silent' })
