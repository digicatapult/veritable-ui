import 'reflect-metadata'

import { pino } from 'pino'
import { container } from 'tsyringe'

import { InitEnv } from './env/index.js'
import { type ILogger } from './logger.js'
import { CredentialSchema } from './models/credentialSchema.js'
import VeritableCloudagent from './models/veritableCloudagent/index.js'

const env = container.resolve(InitEnv)

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
