import 'reflect-metadata'

import dotenv from 'dotenv'
import envalid from 'envalid'
import { pino } from 'pino'

import { PartialEnv, envConfig } from './env.js'
import { type ILogger } from './logger.js'
import { CredentialSchema } from './models/credentialSchema.js'
import VeritableCloudagent from './models/veritableCloudagent.js'

type InitConfigKeys =
  | 'CLOUDAGENT_ADMIN_ORIGIN'
  | 'LOG_LEVEL'
  | 'ISSUANCE_DID_POLICY'
  | 'ISSUANCE_SCHEMA_POLICY'
  | 'ISSUANCE_CRED_DEF_POLICY'

class InitEnv implements PartialEnv<InitConfigKeys> {
  private values: Pick<envalid.CleanedEnv<typeof envConfig>, InitConfigKeys>

  constructor() {
    if (process.env.NODE_ENV === 'test') {
      dotenv.config({ path: 'test/test.env' })
    } else {
      dotenv.config()
    }

    this.values = envalid.cleanEnv(process.env, {
      CLOUDAGENT_ADMIN_ORIGIN: envConfig.CLOUDAGENT_ADMIN_ORIGIN,
      LOG_LEVEL: envConfig.LOG_LEVEL,
      ISSUANCE_DID_POLICY: envConfig.ISSUANCE_DID_POLICY,
      ISSUANCE_SCHEMA_POLICY: envConfig.ISSUANCE_SCHEMA_POLICY,
      ISSUANCE_CRED_DEF_POLICY: envConfig.ISSUANCE_CRED_DEF_POLICY,
    })
  }

  get<K extends InitConfigKeys>(key: K) {
    return this.values[key]
  }
}
const env = new InitEnv()

const logger: ILogger = pino(
  {
    name: 'veritable-ui-init',
    timestamp: true,
    level: env.get('LOG_LEVEL'),
  },
  process.stdout
)
const cloudagent = new VeritableCloudagent(env, logger)
const init = new CredentialSchema(env, logger, cloudagent)
const details = await init.assertIssuanceRecords()
logger.info(details, 'Asserted credential issuance records with: %o', details)
