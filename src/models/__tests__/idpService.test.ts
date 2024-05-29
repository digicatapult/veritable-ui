import { afterEach, beforeEach, describe, test } from 'mocha'
import { expect } from 'chai'
import { MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'undici'

import Pino from 'pino'
import { Env } from '../../env.js'
import { ForbiddenError } from '../../errors.js'
import IDPService from '../idpService.js'

const pino = Pino.default

const mockEnv: Env = {
  get: (name: string) => {
    if (name === 'IDP_CLIENT_ID') return 'veritable-ui'
    if (name === 'IDP_PUBLIC_URL_PREFIX') return 'http://public.example.com'
    if (name === 'IDP_INTERNAL_URL_PREFIX') return 'http://internal.example.com'
    if (name === 'IDP_INTERNAL_URL_PREFIX') return 'http://public.example.com'
    if (name === 'IDP_AUTH_PATH') return '/auth'
    if (name === 'IDP_TOKEN_PATH') return '/token'
    if (name === 'IDP_JWKS_PATH') return '/jwks'
    return ''
  },
} as Env

const mockLogger = pino({ level: 'silent' })

const mockTokenResponse = {
  access_token: 'access',
  expires_in: 42,
  refresh_expires_in: 43,
  refresh_token: 'refresh',
  token_type: 'jwt',
  'not-before-policy': 44,
  session_state: 'session',
  scope: 'test',
}

describe('IDPService', () => {
  const originalDispatcher = getGlobalDispatcher()
  const mockAgent = new MockAgent()
  const mockOidc = mockAgent.get(`http://internal.example.com`)
  beforeEach(function () {
    setGlobalDispatcher(mockAgent)
  })

  afterEach(function () {
    setGlobalDispatcher(originalDispatcher)
  })

  test('authorizationEndpoint (INTERNAL)', async function () {
    const idpService = new IDPService(mockEnv, mockLogger)
    const result = await idpService.authorizationEndpoint('INTERNAL')
    expect(result).to.equal('http://internal.example.com/auth')
  })

  test('tokenEndpoint (INTERNAL)', async function () {
    const idpService = new IDPService(mockEnv, mockLogger)
    const result = await idpService.tokenEndpoint('INTERNAL')
    expect(result).to.equal('http://internal.example.com/token')
  })

  test('jwksUri (INTERNAL)', async function () {
    const idpService = new IDPService(mockEnv, mockLogger)
    const result = await idpService.jwksUri('INTERNAL')
    expect(result).to.equal('http://internal.example.com/jwks')
  })

  test('authorizationEndpoint (PUBLIC)', async function () {
    const idpService = new IDPService(mockEnv, mockLogger)
    const result = await idpService.authorizationEndpoint('PUBLIC')
    expect(result).to.equal('http://public.example.com/auth')
  })

  test('tokenEndpoint (PUBLIC)', async function () {
    const idpService = new IDPService(mockEnv, mockLogger)
    const result = await idpService.tokenEndpoint('PUBLIC')
    expect(result).to.equal('http://public.example.com/token')
  })

  test('jwksUri (PUBLIC)', async function () {
    const idpService = new IDPService(mockEnv, mockLogger)
    const result = await idpService.jwksUri('PUBLIC')
    expect(result).to.equal('http://public.example.com/jwks')
  })

  describe('getTokenFromCode', function () {
    const setupMock = (code: number, response: string | object) => {
      mockOidc
        .intercept({
          method: 'POST',
          path: '/token',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: 'veritable-ui',
            code: '1234',
            redirect_uri: '/redirect',
          }).toString(),
        })
        .reply(code, response)
    }

    test('success', async function () {
      setupMock(200, mockTokenResponse)
      const idpService = new IDPService(mockEnv, mockLogger)

      const result = await idpService.getTokenFromCode('1234', '/redirect')

      expect(result).deep.equal(mockTokenResponse)
    })

    test('error response throws ForbiddenError', async function () {
      setupMock(500, 'this is bad')
      const idpService = new IDPService(mockEnv, mockLogger)

      let error: unknown
      try {
        await idpService.getTokenFromCode('1234', '/redirect')
      } catch (err) {
        error = err
      }

      expect(error).instanceOf(ForbiddenError)
    })

    test('response not json throws ForbiddenError', async function () {
      setupMock(200, 'not json')
      const idpService = new IDPService(mockEnv, mockLogger)

      let error: unknown
      try {
        await idpService.getTokenFromCode('1234', '/redirect')
      } catch (err) {
        error = err
      }

      expect(error).instanceOf(ForbiddenError)
    })

    test('invalid response throws ForbiddenError', async function () {
      setupMock(200, {})
      const idpService = new IDPService(mockEnv, mockLogger)

      let error: unknown
      try {
        await idpService.getTokenFromCode('1234', '/redirect')
      } catch (err) {
        error = err
      }

      expect(error).instanceOf(ForbiddenError)
    })
  })

  describe('getTokenFromRefresh', function () {
    const setupMock = (code: number, response: string | object) => {
      mockOidc
        .intercept({
          method: 'POST',
          path: '/token',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: 'refresh',
            client_id: 'veritable-ui',
          }).toString(),
        })
        .reply(code, response)
    }

    test('success', async function () {
      setupMock(200, mockTokenResponse)
      const idpService = new IDPService(mockEnv, mockLogger)

      const result = await idpService.getTokenFromRefresh('refresh')

      expect(result).deep.equal(mockTokenResponse)
    })

    test('error response throws ForbiddenError', async function () {
      setupMock(500, 'this is bad')
      const idpService = new IDPService(mockEnv, mockLogger)

      let error: unknown
      try {
        await idpService.getTokenFromRefresh('refresh')
      } catch (err) {
        error = err
      }

      expect(error).instanceOf(ForbiddenError)
    })

    test('response not json throws ForbiddenError', async function () {
      setupMock(200, 'not json')
      const idpService = new IDPService(mockEnv, mockLogger)

      let error: unknown
      try {
        await idpService.getTokenFromRefresh('refresh')
      } catch (err) {
        error = err
      }

      expect(error).instanceOf(ForbiddenError)
    })

    test('invalid response throws ForbiddenError', async function () {
      setupMock(200, {})
      const idpService = new IDPService(mockEnv, mockLogger)

      let error: unknown
      try {
        await idpService.getTokenFromRefresh('refresh')
      } catch (err) {
        error = err
      }

      expect(error).instanceOf(ForbiddenError)
    })
  })
})
