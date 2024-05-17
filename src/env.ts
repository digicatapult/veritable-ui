import dotenv from 'dotenv'
import * as envalid from 'envalid'
import { singleton } from 'tsyringe'

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: 'test/test.env' })
} else {
  dotenv.config()
}

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

const envConfig = {
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
  IDP_AUTH_PATH: envalid.url({
    default: '/auth',
  }),
  IDP_TOKEN_PATH: envalid.url({
    default: '/token',
  }),
  IDP_JWKS_PATH: envalid.url({
    default: '/certs',
  }),
  COMPANY_HOUSE_API_URL: envalid.str({ default: 'https://api.company-information.service.gov.uk' }),
  COMPANY_PROFILE_API_KEY: envalid.str(),
}

export type ENV_CONFIG = typeof envConfig
export type ENV_KEYS = keyof ENV_CONFIG

@singleton()
export class Env {
  private vals: envalid.CleanedEnv<typeof envConfig>

  constructor() {
    this.vals = envalid.cleanEnv(process.env, envConfig)
  }

  get<K extends ENV_KEYS>(key: K) {
    return this.vals[key]
  }
}
