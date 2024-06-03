export const successResponse = {
  invitationUrl: 'example.com',
  invitation: {
    '@id': 'example-id',
  },
}

export const successResponseTransformed = {
  invitationUrl: 'example.com',
  invitation: {
    id: 'example-id',
  },
}

export const invalidResponse = {
  invitationUrl: 'example.com',
  invitation: {
    id: 'should be @id',
  },
}
