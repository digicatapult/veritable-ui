import envalid from 'envalid'
import { singleton } from 'tsyringe'

import { loadEnvAndOptions } from './common.js'

const smtpConfig = {
  SMTP_HOST: envalid.str({ devDefault: 'localhost' }),
  SMTP_PORT: envalid.port({ devDefault: 2525 }),
  SMTP_SECURE: envalid.bool({ devDefault: false, default: true }), // smtp4dev does not use TLS by default so false in dev mode
  SMTP_USER: envalid.str({ devDefault: '' }), // no auth required by default for smtp4dev
  SMTP_PASS: envalid.str({ devDefault: '' }),
}

type SMTP_CONFIG = typeof smtpConfig
type SMTP_KEYS = keyof SMTP_CONFIG
@singleton()
export class SmtpEnv {
  private vals: Pick<envalid.CleanedEnv<SMTP_CONFIG>, SMTP_KEYS>

  constructor() {
    const { env, options } = loadEnvAndOptions()
    this.vals = envalid.cleanEnv(
      env,
      {
        SMTP_HOST: smtpConfig.SMTP_HOST,
        SMTP_PORT: smtpConfig.SMTP_PORT,
        SMTP_SECURE: smtpConfig.SMTP_SECURE,
        SMTP_AUTH_TYPE: smtpConfig.SMTP_AUTH_TYPE,
        SMTP_USER: smtpConfig.SMTP_USER,
        SMTP_PASS: smtpConfig.SMTP_PASS,
      },
      options
    )
  }

  get<K extends SMTP_KEYS>(key: K) {
    return this.vals[key]
  }
}
