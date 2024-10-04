import * as envalid from 'envalid'
import { singleton } from 'tsyringe'

import { DEFAULT_CONFIG, DEFAULT_KEYS, defaultConfig, loadEnvAndOptions, PartialEnv } from './common.js'

export type { PartialEnv } from './common.js'
export { InitEnv } from './init.js'
export { SmtpEnv } from './smtp.js'

@singleton()
export class Env<KS extends DEFAULT_KEYS = DEFAULT_KEYS> implements PartialEnv<KS> {
  private vals: Pick<envalid.CleanedEnv<DEFAULT_CONFIG>, KS>

  constructor() {
    const { env, options } = loadEnvAndOptions()
    this.vals = envalid.cleanEnv(env, defaultConfig, options)
  }

  get<K extends KS>(key: K) {
    return this.vals[key]
  }
}
