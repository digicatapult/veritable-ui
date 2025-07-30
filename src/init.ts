import 'reflect-metadata'

import { pino } from 'pino'
import { container } from 'tsyringe'

import { Command } from 'commander'
import { InitEnv } from './env/index.js'
import { type ILogger } from './logger.js'
import { CredentialSchema } from './models/credentialSchema.js'
import VeritableCloudagent from './models/veritableCloudagent/index.js'
import { loadSchema } from './utils/schemaImporter.js'
import version from './utils/version.js'

const program = new Command()
program
  .name('veritable-init')
  .description('Veritable Init CLI')
  .version(version, '-v, --version', 'output the current version')
  .option('--add-schema <path>', 'Add a schema from a JSON file')
  .parse(process.argv)

const options = program.opts()
const filePath = options.addSchema || './schemas/companyIdentitySchema.json'

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
const schema = await loadSchema(filePath)
const init = new CredentialSchema(env, logger, cloudagent)
init.addSchema(schema.name, schema)
const details = await init.assertIssuanceRecords()
logger.info(details, 'Asserted credential issuance records with: %o', details)
