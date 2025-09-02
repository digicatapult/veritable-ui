import { pino } from 'pino'

import type { ILogger } from '../../../../logger.js'

export const createInviteSuccessResponse = {
  invitationUrl: 'http://example.com',
  outOfBandRecord: { id: '00000001-7672-470e-a803-a2f8feb52944' },
}

export const receiveInviteSuccessResponse = {
  outOfBandRecord: {
    id: '00000001-7672-470e-a803-a2f8feb52944',
  },
  connectionRecord: {
    id: '00000000-7672-470e-a803-a2f8feb52944',
  },
}

export const getConnectionsSuccessResponse = [
  {
    id: '00000000-7672-470e-a803-a2f8feb52944',
    state: 'completed',
    outOfBandId: '00000001-7672-470e-a803-a2f8feb52944',
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
  result: {
    value: 'result',
  },
  id: '00000002-7672-470e-a803-a2f8feb52944',
}

export const mockLogger: ILogger = pino({ level: 'silent' })
