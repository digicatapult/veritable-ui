import dotenv from 'dotenv'
import * as envalid from 'envalid'
import { singleton } from 'tsyringe'

const strArrayValidator = envalid.makeValidator((input) => {
  const arr = input
    .split(',')
    .map((s) => s.trim())
    .filter((s) => !!s)

  const first = arr.shift()
  if (first === undefined) {
    throw new Error('must provide at least one cookie signing key')
  }
  const res: [string, ...string[]] = [first, ...arr]
  return res
})

const issuanceRecordValidator = envalid.makeValidator((input) => {
  if (input === 'CREATE_NEW') {
    return 'CREATE_NEW' as const
  }

  if (input === 'FIND_EXISTING') {
    return 'FIND_EXISTING' as const
  }

  if (input === 'EXISTING_OR_NEW') {
    return 'EXISTING_OR_NEW' as const
  }

  if (input.match(/^did:/)) {
    return input as `did:${string}`
  }
  if (input.match(/^ipfs:\/\//)) {
    return input as `ipfs://${string}`
  }

  throw new Error('must supply a valid issuance policy')
})

const pinSecretValidator = envalid.makeValidator((input) => {
  if (!input) {
    throw new Error('Invalid pin secret value')
  }

  return Buffer.from(input, 'utf8')
})

export const envConfig = {
  PORT: envalid.port({ default: 3000 }),
  LOG_LEVEL: envalid.str({ default: 'info', devDefault: 'debug' }),
  DB_HOST: envalid.host({ devDefault: 'localhost' }),
  DB_NAME: envalid.str({ default: 'veritable-ui' }),
  DB_USERNAME: envalid.str({ devDefault: 'postgres' }),
  DB_PASSWORD: envalid.str({ devDefault: 'postgres' }),
  DB_PORT: envalid.port({ default: 5432 }),
  COOKIE_SESSION_KEYS: strArrayValidator({ devDefault: ['secret'] }),
  PUBLIC_URL: envalid.url({ devDefault: 'http://localhost:3000' }),
  API_SWAGGER_BG_COLOR: envalid.str({ default: '#fafafa' }),
  API_SWAGGER_TITLE: envalid.str({ default: 'Veritable' }),
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
  EMAIL_TRANSPORT: envalid.str({ default: 'STREAM', choices: ['STREAM'] }),
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
}

export type ENV_CONFIG = typeof envConfig
export type ENV_KEYS = keyof ENV_CONFIG

export interface PartialEnv<KS extends ENV_KEYS = ENV_KEYS> {
  get<K extends KS>(key: K): Pick<envalid.CleanedEnv<typeof envConfig>, KS>[K]
}

@singleton()
export class Env<KS extends ENV_KEYS = ENV_KEYS> implements PartialEnv<KS> {
  private vals: Pick<envalid.CleanedEnv<typeof envConfig>, KS>

  constructor() {
    if (process.env.NODE_ENV === 'test') {
      dotenv.config({ path: 'test/test.env' })
    } else {
      dotenv.config()
    }

    this.vals = envalid.cleanEnv(process.env, envConfig)
  }

  get<K extends KS>(key: K) {
    return this.vals[key]
  }
}
