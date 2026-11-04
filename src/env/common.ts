import dotenv from 'dotenv'
import { bool, CleanedEnv, cleanEnv, email, host, num, port, str, url } from 'envalid'

import { container } from 'tsyringe'
import { registryTypes } from '../models/db/types.js'
import { countryCodes } from '../models/stringTypes.js'
import {
  emailTransportValidator,
  issuanceRecordValidator,
  pinSecretValidator,
  strArrayValidator,
} from './validators.js'

export const defaultConfig = {
  PORT: port({ default: 3000 }),
  LOG_LEVEL: str({ default: 'info', devDefault: 'debug' }),
  DB_HOST: host({ devDefault: 'localhost' }),
  DB_NAME: str({ default: 'veritable-ui' }),
  DB_USERNAME: str({ devDefault: 'postgres' }),
  DB_PASSWORD: str({ devDefault: 'postgres' }),
  DB_PORT: port({ default: 5432 }),
  COOKIE_SESSION_KEYS: strArrayValidator({ devDefault: ['secret'] }),
  PUBLIC_URL: url({ devDefault: 'http://localhost:3000' }),
  API_SWAGGER_BG_COLOR: str({ devDefault: '#38b6ff', default: '#ffffff' }),
  API_SWAGGER_TITLE: str({ devDefault: 'Alice', default: 'veritable' }),
  API_SWAGGER_HEADING: str({ default: 'Veritable' }),
  IDP_CLIENT_ID: str({ devDefault: 'veritable-ui' }),
  IDP_PUBLIC_URL_PREFIX: url({
    devDefault: 'http://localhost:3080/realms/veritable/protocol/openid-connect',
  }),
  IDP_INTERNAL_URL_PREFIX: url({
    devDefault: 'http://localhost:3080/realms/veritable/protocol/openid-connect',
  }),
  IDP_AUTH_PATH: str({
    default: '/auth',
  }),
  IDP_TOKEN_PATH: str({
    default: '/token',
  }),
  IDP_JWKS_PATH: str({
    default: '/certs',
  }),
  COMPANY_HOUSE_API_URL: str({ default: 'https://api.company-information.service.gov.uk' }), // TODO: all registries will need this
  COMPANY_PROFILE_API_KEY: str(), // TODO: keep this as we may have more registries configured at the same time
  // TODO: add other registries here will need some sort of validator if we have all the envs for the configured registries or will these be in db?
  EMAIL_TRANSPORT: emailTransportValidator({ default: { type: 'STREAM' } }),
  EMAIL_FROM_ADDRESS: email({ default: 'hello@veritable.com' }),
  EMAIL_ADMIN_ADDRESS: email({ default: 'admin@veritable.com' }),
  CLOUDAGENT_ADMIN_ORIGIN: url({ devDefault: 'http://localhost:3100' }),
  CLOUDAGENT_ADMIN_WS_ORIGIN: url({ devDefault: 'ws://localhost:3100' }),
  CLOUDAGENT_ADMIN_PING_TIMEOUT_MS: num({ default: 30000 }),
  INVITATION_PIN_SECRET: pinSecretValidator({ devDefault: Buffer.from('secret', 'utf8') }),
  INVITATION_PIN_ATTEMPT_LIMIT: num({ default: 5 }),
  INVITATION_FROM_COMPANY_NUMBER: str({ devDefault: '07964699' }), // TODO: change to LOCAL_COMPANY_NUMBER ??
  ISSUANCE_DID_POLICY: issuanceRecordValidator({ devDefault: 'EXISTING_OR_NEW' }),
  ISSUANCE_SCHEMA_POLICY: issuanceRecordValidator({ devDefault: 'EXISTING_OR_NEW' }),
  ISSUANCE_CRED_DEF_POLICY: issuanceRecordValidator({ devDefault: 'EXISTING_OR_NEW' }),
  DEMO_MODE: bool({ devDefault: true, default: false }),
  NY_STATE_API_URL: str({ default: 'https://data.ny.gov/resource/p66s-i79p.json' }),
  LOCAL_REGISTRY_TO_USE: str({
    default: 'company_house',
    devDefault: 'company_house',
    choices: registryTypes,
  }),
  LOCAL_REGISTRY_COUNTRY_CODE: str({
    default: 'GB',
    devDefault: 'GB',
    choices: countryCodes,
  }),
  OPEN_CORPORATES_API_URL: str({
    devDefault: 'http://localhost:8443',
    default: 'https://api.opencorporates.com/v0.4',
  }),
  OPEN_CORPORATES_API_KEY: str({ devDefault: 'test-key' }),
  IPID_API_URL: str({ default: 'https://sandbox.ipid.works' }),
  IPID_API_KEY: str(),
  IPID_CUSTOMER_ID: str({ default: 'digicatapult-uat' }),
}

// we mainly separate out the raw environment loading so we can override it safely in tests
export const RAW_ENV_TOKEN = Symbol()
container.register(RAW_ENV_TOKEN, {
  useFactory: () => {
    if (process.env.NODE_ENV === 'test') {
      dotenv.config({ path: 'test/test.env' })
    } else {
      dotenv.config()
    }

    const env = {
      ...process.env,
      ...Object.fromEntries(
        Object.entries(process.env)
          .map(([key, value]) => {
            if (key.startsWith('VERITABLE_')) {
              return [key.substring('VERITABLE_'.length), value]
            }
            return null
          })
          .filter((x) => !!x)
      ),
    }

    return { env, options: undefined }
  },
})

export const loadEnvAndOptions = () => {
  return container.resolve<{ env: NodeJS.ProcessEnv; options: Parameters<typeof cleanEnv>['2'] }>(RAW_ENV_TOKEN)
}

export type DEFAULT_CONFIG = typeof defaultConfig
export type DEFAULT_KEYS = keyof DEFAULT_CONFIG
export interface PartialEnv<KS extends DEFAULT_KEYS = DEFAULT_KEYS> {
  get<K extends KS>(key: K): Pick<CleanedEnv<DEFAULT_CONFIG>, KS>[K]
}
