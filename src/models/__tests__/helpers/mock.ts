import { container } from 'tsyringe'
import { RAW_ENV_TOKEN } from '../../../env/common'

const requiredEnvs = {
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
  INVITATION_PIN_SECRET: 'secret',
  ISSUANCE_CRED_DEF_POLICY: 'CREATE_NEW',
  ISSUANCE_DID_POLICY: 'CREATE_NEW',
  ISSUANCE_SCHEMA_POLICY: 'CREATE_NEW',
  PUBLIC_URL: 'http://localhost:3000',
  COMPANY_HOUSE_API_URL: 'http://localhost:8443',
  SOCRATA_API_URL: 'http://localhost:8443',
  NODE_ENV: 'test',
  OPEN_CORPORATES_API_URL: 'http://localhost:8443',
  OPEN_CORPORATES_API_KEY: 'test-key',
}

export const socrataAsLocalRegistry = {
  INVITATION_FROM_COMPANY_NUMBER: '3211809',
  LOCAL_REGISTRY_COUNTRY_CODE: 'US',
  LOCAL_REGISTRY_TO_USE: 'socrata',
  ...requiredEnvs,
}

export const companyHouseAsLocalRegistry = {
  INVITATION_FROM_COMPANY_NUMBER: '07964699',
  LOCAL_REGISTRY_COUNTRY_CODE: 'GB',
  LOCAL_REGISTRY_TO_USE: 'company_house',
  ...requiredEnvs,
}

export const openCorporatesAsLocalRegistry = {
  INVITATION_FROM_COMPANY_NUMBER: '00102498',
  LOCAL_REGISTRY_COUNTRY_CODE: 'GB',
  LOCAL_REGISTRY_TO_USE: 'open_corporates',
  ...requiredEnvs,
}

class MockEnv {
  private vals: Record<string, unknown>

  constructor(vals: Record<string, unknown>) {
    this.vals = vals
  }

  get<K extends keyof typeof this.vals>(key: K) {
    return this.vals[key]
  }
}

export const mockRegistryEnv = (vals: Record<string, unknown>) => {
  const mockEnv = new MockEnv(vals)
  container.registerInstance(RAW_ENV_TOKEN, mockEnv)
}
