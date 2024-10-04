import envalid from 'envalid'
import { singleton } from 'tsyringe'

import { DEFAULT_CONFIG, defaultConfig, loadEnvAndOptions, PartialEnv } from './common.js'

type INIT_ENV_KEYS =
  | 'CLOUDAGENT_ADMIN_ORIGIN'
  | 'LOG_LEVEL'
  | 'ISSUANCE_DID_POLICY'
  | 'ISSUANCE_SCHEMA_POLICY'
  | 'ISSUANCE_CRED_DEF_POLICY'

@singleton()
export class InitEnv implements PartialEnv<INIT_ENV_KEYS> {
  private values: Pick<envalid.CleanedEnv<DEFAULT_CONFIG>, INIT_ENV_KEYS>

  constructor() {
    loadEnvAndOptions()
    const { env, options } = loadEnvAndOptions()
    this.values = envalid.cleanEnv(
      env,
      {
        CLOUDAGENT_ADMIN_ORIGIN: defaultConfig.CLOUDAGENT_ADMIN_ORIGIN,
        LOG_LEVEL: defaultConfig.LOG_LEVEL,
        ISSUANCE_DID_POLICY: defaultConfig.ISSUANCE_DID_POLICY,
        ISSUANCE_SCHEMA_POLICY: defaultConfig.ISSUANCE_SCHEMA_POLICY,
        ISSUANCE_CRED_DEF_POLICY: defaultConfig.ISSUANCE_CRED_DEF_POLICY,
      },
      options
    )
  }

  get<K extends INIT_ENV_KEYS>(key: K) {
    return this.values[key]
  }
}
