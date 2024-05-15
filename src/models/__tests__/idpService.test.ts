import { afterEach, beforeEach, describe, test } from 'mocha'
import { MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'undici'

import pino from 'pino'
import { Env } from '../../env.js'
import { ForbiddenError } from '../../errors.js'
import IDPService from '../idpService.js'

const mockEnv: Env = {
  get: (name: string) => {
    if (name === 'IDP_OIDC_CONFIG_URL') return 'https://keycloak.example.com/.well_known/jwks.json'
    if (name === 'IDP_CLIENT_ID') return 'veritable-ui'
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
  let expect: Chai.ExpectStatic
  before(async () => {
    expect = (await import('chai')).expect
  })

  const originalDispatcher = getGlobalDispatcher()
  const mockAgent = new MockAgent()
  const mockOidc = mockAgent.get(`https://keycloak.example.com`)
  beforeEach(function () {
    setGlobalDispatcher(mockAgent)
    mockOidc
      .intercept({
        path: '/.well_known/jwks.json',
        method: 'GET',
      })
      .reply(200, {
        issuer: 'ISSUER',
        authorization_endpoint: 'AUTHORIZATION_ENDPOINT',
        token_endpoint: 'https://keycloak.example.com/TOKEN_ENDPOINT',
        introspection_endpoint: 'INTROSPECTION_ENDPOINT',
        userinfo_endpoint: 'USERINFO_ENDPOINT',
        end_session_endpoint: 'END_SESSION_ENDPOINT',
        jwks_uri: 'JWKS_URI',
      })
      .persist()
  })

  afterEach(function () {
    setGlobalDispatcher(originalDispatcher)
  })

  test('issuer', async function () {
    const idpService = new IDPService(mockEnv, mockLogger)
    const result = await idpService.issuer
    expect(result).to.equal('ISSUER')
  })

  test('authorizationEndpoint', async function () {
    const idpService = new IDPService(mockEnv, mockLogger)
    const result = await idpService.authorizationEndpoint
    expect(result).to.equal('AUTHORIZATION_ENDPOINT')
  })

  test('tokenEndpoint', async function () {
    const idpService = new IDPService(mockEnv, mockLogger)
    const result = await idpService.tokenEndpoint
    expect(result).to.equal('https://keycloak.example.com/TOKEN_ENDPOINT')
  })

  test('introspectionEndpoint', async function () {
    const idpService = new IDPService(mockEnv, mockLogger)
    const result = await idpService.introspectionEndpoint
    expect(result).to.equal('INTROSPECTION_ENDPOINT')
  })

  test('userinfoEndpoint', async function () {
    const idpService = new IDPService(mockEnv, mockLogger)
    const result = await idpService.userinfoEndpoint
    expect(result).to.equal('USERINFO_ENDPOINT')
  })

  test('endSessionEndpoint', async function () {
    const idpService = new IDPService(mockEnv, mockLogger)
    const result = await idpService.endSessionEndpoint
    expect(result).to.equal('END_SESSION_ENDPOINT')
  })

  test('jwksUri', async function () {
    const idpService = new IDPService(mockEnv, mockLogger)
    const result = await idpService.jwksUri
    expect(result).to.equal('JWKS_URI')
  })

  describe('getTokenFromCode', function () {
    const setupMock = (code: number, response: string | object) => {
      mockOidc
        .intercept({
          method: 'POST',
          path: '/TOKEN_ENDPOINT',
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
          path: '/TOKEN_ENDPOINT',
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
