import { PublicKeyResponse, ValidateResponse } from '../../ipid'
import { CountryCode } from '../../strings'

export const validNodeId = 'test-node-01'
export const pgpPublicKey = '-----BEGIN PGP PUBLIC KEY BLOCK-----\nFAKEKEY123ABC==\n-----END PGP PUBLIC KEY BLOCK-----'
export const encryptedPayload = '-----BEGIN PGP MESSAGE-----\nENCRYPTED123PAYLOAD==\n-----END PGP MESSAGE-----'
export const validCountryCode: CountryCode = 'GB'
export const invalidCountryCode: string = 'ABC'

export const publicKeyResponse: PublicKeyResponse = {
  response_code: 2000,
  response_message: 'Success',
  data: {
    node_id: validNodeId,
    node_public_key: pgpPublicKey,
  },
}

export const invalidPublicKeyResponse: PublicKeyResponse = {
  response_code: 4004,
  response_message: 'Country not supported by Validate',
} as PublicKeyResponse

export const validateResponse: ValidateResponse = {
  response_code: 2000,
  response_message: 'ValidationSucceeded',
  data: {
    match_score: 1,
    match_score_description: 'Strong match',
  },
}

export const badValidateResponse: ValidateResponse = {
  response_code: 2103,
  response_message: 'CreditorAccountDetailUnableToValidate',
} as ValidateResponse
