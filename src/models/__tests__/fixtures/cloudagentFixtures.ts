export const createInviteSuccessResponse = {
  invitationUrl: 'example.com',
  invitation: {
    '@id': 'example-id',
  },
}

export const createInviteSuccessResponseTransformed = {
  invitationUrl: 'example.com',
  invitation: {
    id: 'example-id',
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
