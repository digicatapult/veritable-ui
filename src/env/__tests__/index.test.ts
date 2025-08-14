import { expect } from 'chai'
import { afterEach, describe, test } from 'mocha'
import { container } from 'tsyringe'

import { resetContainer } from '../../ioc.js'
import { RAW_ENV_TOKEN } from '../common.js'
import { Env } from '../index.js'

const requiredProdEnvs = {
  COMPANY_PROFILE_API_KEY: 'xyz',
  CLOUDAGENT_ADMIN_ORIGIN: 'http://localhost:3100',
  CLOUDAGENT_ADMIN_WS_ORIGIN: 'http://localhost:3100',
  COOKIE_SESSION_KEYS: 'test',
  DB_HOST: 'localhost',
  DB_PASSWORD: 'password',
  DB_USERNAME: 'postgres',
  IDP_CLIENT_ID: 'veritable',
  IDP_INTERNAL_URL_PREFIX: 'http://localhost:3080/realms/veritable/protocol/openid-connect',
  IDP_PUBLIC_URL_PREFIX: 'http://localhost:3080/realms/veritable/protocol/openid-connect',
  INVITATION_FROM_COMPANY_NUMBER: '04659351',
  INVITATION_PIN_SECRET: 'secret',
  ISSUANCE_CRED_DEF_POLICY: 'CREATE_NEW',
  ISSUANCE_DID_POLICY: 'CREATE_NEW',
  ISSUANCE_SCHEMA_POLICY: 'CREATE_NEW',
  PUBLIC_URL: 'http://localhost:3000',
  IPID_API_KEY: 'xyz',
  LOCAL_REGISTRY_TO_USE: 'open_corporates',
  LOCAL_REGISTRY_COUNTRY_CODE: 'GB',
  OPEN_CORPORATES_API_KEY: 'xyz',
  OPEN_CORPORATES_API_URL: 'http://localhost:8443/companies',
}

const requiredDevEnvs = {
  COMPANY_PROFILE_API_KEY: 'xyz',
  IPID_API_KEY: 'xyz',
}

class EnvalidTestReporterError extends Error {
  constructor(public errors: object) {
    super('EnvalidTestReporterError')
  }
}

const mockProcessEnv = (vals: Record<string, unknown>) => {
  container.registerInstance(RAW_ENV_TOKEN, {
    env: vals,
    options: {
      reporter: (obj: { errors: object }) => {
        if (Object.keys(obj.errors).length !== 0) {
          throw new EnvalidTestReporterError(obj.errors)
        }
      },
    },
  })
}

describe('Env', function () {
  afterEach(function () {
    resetContainer()
  })

  describe('happy paths', function () {
    test('should load config with required envs only (test)', function () {
      mockProcessEnv({
        NODE_ENV: 'test',
        ...requiredDevEnvs,
      })

      let error: unknown = null
      try {
        new Env()
      } catch (e) {
        error = e
      }

      expect(error).to.equal(null)
    })

    test('should load config with required envs only (dev)', function () {
      mockProcessEnv({
        NODE_ENV: 'dev',
        ...requiredDevEnvs,
      })

      let error: unknown = null
      try {
        new Env()
      } catch (e) {
        error = e
      }

      expect(error).to.equal(null)
    })

    test('should load config with required envs only (production)', function () {
      mockProcessEnv({
        NODE_ENV: 'production',
        ...requiredProdEnvs,
      })

      let error: unknown = null
      try {
        new Env()
      } catch (e) {
        error = e
      }

      expect(error).to.equal(null)
    })

    test('smtp email transport (dev)', function () {
      mockProcessEnv({
        NODE_ENV: 'dev',
        ...requiredDevEnvs,
        EMAIL_TRANSPORT: 'SMTP_EMAIL',
      })

      let error: unknown = null
      try {
        new Env()
      } catch (e) {
        error = e
      }

      expect(error).to.equal(null)
    })

    test('smtp email transport (production)', function () {
      mockProcessEnv({
        NODE_ENV: 'production',
        ...requiredProdEnvs,
        EMAIL_TRANSPORT: 'SMTP_EMAIL',
        SMTP_HOST: 'localhost',
        SMTP_PASS: 'password',
        SMTP_PORT: 2323,
        SMTP_USER: 'user',
      })

      let error: unknown = null
      try {
        new Env() // WHY???
      } catch (e) {
        error = e
      }

      expect(error).to.equal(null)
    })
  })

  describe('smtp envs missing (production)', function () {
    test('smtp email transport missing envs (production)', function () {
      mockProcessEnv({
        NODE_ENV: 'production',
        ...requiredProdEnvs,
        EMAIL_TRANSPORT: 'SMTP_EMAIL',
      })

      let error: unknown = null
      try {
        new Env()
      } catch (e) {
        error = e
      }

      expect(error).instanceOf(EnvalidTestReporterError)
      if (!(error instanceof EnvalidTestReporterError)) {
        expect.fail()
      }
      expect(Object.keys(error.errors)).to.deep.equal(['EMAIL_TRANSPORT'])

      const nestedErrors = error.errors
      if (!('EMAIL_TRANSPORT' in nestedErrors)) {
        expect.fail('Expect EMAIL_TRANSPORT error')
      }
      const transportError = nestedErrors.EMAIL_TRANSPORT
      if (!(transportError instanceof EnvalidTestReporterError)) {
        expect.fail('Expect EMAIL_TRANSPORT error to be of type EnvalidTestReporterError')
      }

      expect(Object.keys(transportError.errors).sort()).to.deep.equal(
        ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'].sort()
      )
    })
  })
})
