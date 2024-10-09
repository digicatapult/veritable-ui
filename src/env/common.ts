import dotenv from 'dotenv'
import envalid from 'envalid'

import { container } from 'tsyringe'
import {
  emailTransportValidator,
  issuanceRecordValidator,
  pinSecretValidator,
  strArrayValidator,
} from './validators.js'

export const defaultConfig = {
  PORT: envalid.port({ default: 3000 }),
  LOG_LEVEL: envalid.str({ default: 'info', devDefault: 'debug' }),
  DB_HOST: envalid.host({ devDefault: 'localhost' }),
  DB_NAME: envalid.str({ default: 'veritable-ui' }),
  DB_USERNAME: envalid.str({ devDefault: 'postgres' }),
  DB_PASSWORD: envalid.str({ devDefault: 'postgres' }),
  DB_PORT: envalid.port({ default: 5432 }),
  COOKIE_SESSION_KEYS: strArrayValidator({ devDefault: ['secret'] }),
  PUBLIC_URL: envalid.url({ devDefault: 'http://localhost:3000' }),
  API_SWAGGER_BG_COLOR: envalid.str({ devDefault: '#38b6ff', default: '#ffffff' }),
  API_SWAGGER_TITLE: envalid.str({ devDefault: 'Alice', default: 'veritable' }),
  API_SWAGGER_HEADING: envalid.str({ default: 'Veritable' }),
  IDP_CLIENT_ID: envalid.str({ devDefault: 'veritable-ui' }),
  IDP_PUBLIC_URL_PREFIX: envalid.url({
    devDefault: 'http://localhost:3080/realms/veritable/protocol/openid-connect',
  }),
  IDP_INTERNAL_URL_PREFIX: envalid.url({
    devDefault: 'http://localhost:3080/realms/veritable/protocol/openid-connect',
  }),
  IDP_AUTH_PATH: envalid.str({
    default: '/auth',
  }),
  IDP_TOKEN_PATH: envalid.str({
    default: '/token',
  }),
  IDP_JWKS_PATH: envalid.str({
    default: '/certs',
  }),
  COMPANY_HOUSE_API_URL: envalid.str({ default: 'https://api.company-information.service.gov.uk' }),
  COMPANY_PROFILE_API_KEY: envalid.str(),
  EMAIL_TRANSPORT: emailTransportValidator({ default: { type: 'STREAM' } }),
  EMAIL_FROM_ADDRESS: envalid.email({ default: 'hello@veritable.com' }),
  EMAIL_ADMIN_ADDRESS: envalid.email({ default: 'admin@veritable.com' }),
  CLOUDAGENT_ADMIN_ORIGIN: envalid.url({ devDefault: 'http://localhost:3100' }),
  CLOUDAGENT_ADMIN_WS_ORIGIN: envalid.url({ devDefault: 'ws://localhost:3100' }),
  INVITATION_PIN_SECRET: pinSecretValidator({ devDefault: Buffer.from('secret', 'utf8') }),
  INVITATION_PIN_ATTEMPT_LIMIT: envalid.num({ default: 5 }),
  INVITATION_FROM_COMPANY_NUMBER: envalid.str({ devDefault: '07964699' }),
  ISSUANCE_DID_POLICY: issuanceRecordValidator({ devDefault: 'EXISTING_OR_NEW' }),
  ISSUANCE_SCHEMA_POLICY: issuanceRecordValidator({ devDefault: 'EXISTING_OR_NEW' }),
  ISSUANCE_CRED_DEF_POLICY: issuanceRecordValidator({ devDefault: 'EXISTING_OR_NEW' }),
  DEMO_MODE: envalid.bool({ devDefault: true, default: false }),
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
  return container.resolve<{ env: NodeJS.ProcessEnv; options: Parameters<typeof envalid.cleanEnv>['2'] }>(RAW_ENV_TOKEN)
}

export type DEFAULT_CONFIG = typeof defaultConfig
export type DEFAULT_KEYS = keyof DEFAULT_CONFIG
export interface PartialEnv<KS extends DEFAULT_KEYS = DEFAULT_KEYS> {
  get<K extends KS>(key: K): Pick<envalid.CleanedEnv<DEFAULT_CONFIG>, KS>[K]
}
