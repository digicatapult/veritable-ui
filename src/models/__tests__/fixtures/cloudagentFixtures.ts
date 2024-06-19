import { pino } from 'pino'

export const createInviteSuccessResponse = {
  invitationUrl: 'example.com',
  invitation: {
    outOfBandRecord: { id: 'example-id' },
  },
}

export const receiveInviteSuccessResponse = {
  outOfBandRecord: {
    id: 'oob-id',
  },
  connectionRecord: {
    id: 'connection-id',
  },
}

export const invalidResponse = {}

export const mockLogger = pino({ level: 'silent' })
