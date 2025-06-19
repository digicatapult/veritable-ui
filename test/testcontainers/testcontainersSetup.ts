import * as fs from 'node:fs'
import path from 'path'
import { GenericContainer, Network, StartedTestContainer, Wait } from 'testcontainers'
import { fileURLToPath } from 'url'
import { parse } from 'yaml'

interface PostgresPasswordAndUser {
  postgresPassword?: string
  postgresUser?: string
}

interface PostgresValuesInterface extends PostgresPasswordAndUser {
  postgresDb: string
}
interface ExposedPortsInterface {
  containerPort: number
  hostPort: number
}

interface VeritableCloudAgentEnvConfig extends PostgresPasswordAndUser {
  endpoint: string
  walletId: string
  walletKey: string
  postgresHost: string
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error'
  inboundTransport?: string
  outboundTransport?: string
  adminPort?: string
  ipfsOrigin?: string
  postgresPort?: string
  label?: string
}

interface VeritableUIConfig {
  hostPort: number
  invitationFromCompanyNumber: string
  companyProfileApiKey: string
}

const network = await new Network().start()

const dockerCompose = fs.readFileSync('./docker-compose.yml', 'utf-8')
const parsed = parse(dockerCompose)
const keycloakVersion = parsed.services.keycloak.image
const postgresVersion = parsed.services['postgres-veritable-ui-alice'].image
const cloudagentVersion = parsed.services['veritable-cloudagent-alice'].image
const kuboVersion = parsed.services.ipfs.image
const smtp4devVersion = parsed.services.smtp4dev.image

export async function bringUpSharedContainers() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)

  const keycloakDataPath = path.resolve(__dirname, '../../docker/keycloak')

  const keycloakContainer = await composeKeycloakContainer(keycloakDataPath)
  const ipfsContainer = await composeIpfsContainer()
  const smtp4dev = await composeSmtp4dev()
  return [keycloakContainer, ipfsContainer, smtp4dev]
}

export async function bringUpAliceUIContainer() {
  const name = 'alice'
  const aliceVeritableUIConfig: VeritableUIConfig = {
    hostPort: 3000,
    invitationFromCompanyNumber: '07964699',
    companyProfileApiKey: process.env.VERITABLE_COMPANY_PROFILE_API_KEY || 'API_KEY',
  }
  const aliceVeritableUIContainer = await veritableUIContainer(name, aliceVeritableUIConfig)
  return [aliceVeritableUIContainer]
}

export async function bringUpBobUIContainer() {
  const name = 'bob'
  const bobVeritableUIConfig: VeritableUIConfig = {
    hostPort: 3001,
    invitationFromCompanyNumber: '04659351',
    companyProfileApiKey: process.env.VERITABLE_COMPANY_PROFILE_API_KEY || 'API_KEY',
  }
  const bobVeritableUIContainer = await veritableUIContainer(name, bobVeritableUIConfig)
  return [bobVeritableUIContainer]
}

export async function bringUpCharlieUIContainer() {
  const name = 'charlie'
  const charlieVeritableUIConfig: VeritableUIConfig = {
    hostPort: 3002,
    invitationFromCompanyNumber: '10016023',
    companyProfileApiKey: process.env.VERITABLE_COMPANY_PROFILE_API_KEY || 'API_KEY',
  }
  const charlieVeritableUIContainer = await veritableUIContainer(name, charlieVeritableUIConfig)
  return [charlieVeritableUIContainer]
}

export async function bringUpAliceDependenciesContainers() {
  const aliceVeritableUIPostgres = await veritableUIPostgresDbContainer(
    'postgres-veritable-ui-alice',
    { containerPort: 5432, hostPort: 5432 },
    { postgresDb: 'veritable-ui' }
  )
  const aliceVeritableCloudagentPostgres = await veritableCloudagentPostgresContainer(
    'postgres-veritable-cloudagent-alice',
    { postgresDb: 'postgres-veritable-cloudagent' }
  )

  const aliceCloudagentEnvConfig: VeritableCloudAgentEnvConfig = {
    endpoint: 'ws://veritable-cloudagent-alice:5003',
    walletId: 'alice',
    walletKey: 'alice-key',
    postgresHost: 'postgres-veritable-cloudagent-alice',
  }
  const aliceCloudAgentContainer = await cloudagentContainer(
    'veritable-cloudagent-alice',
    {
      containerPort: 3000,
      hostPort: 3100,
    },
    aliceCloudagentEnvConfig
  )

  return [aliceVeritableUIPostgres, aliceVeritableCloudagentPostgres, aliceCloudAgentContainer]
}

export async function bringUpBobDependenciesContainers() {
  const bobVeritableUIPostgres = await veritableUIPostgresDbContainer(
    'postgres-veritable-ui-bob',
    { containerPort: 5432, hostPort: 5433 },
    { postgresDb: 'veritable-ui' }
  )
  const bobVeritableCloudagentPostgres = await veritableCloudagentPostgresContainer(
    'postgres-veritable-cloudagent-bob',
    { postgresDb: 'postgres-veritable-cloudagent' }
  )
  const aliceCloudagentEnvConfig: VeritableCloudAgentEnvConfig = {
    endpoint: 'ws://veritable-cloudagent-bob:5003',
    walletId: 'bob',
    walletKey: 'bob-key',
    postgresHost: 'postgres-veritable-cloudagent-bob',
  }
  const bobCloudAgentContainer = await cloudagentContainer(
    'veritable-cloudagent-bob',
    {
      containerPort: 3000,
      hostPort: 3101,
    },
    aliceCloudagentEnvConfig
  )
  return [bobVeritableUIPostgres, bobVeritableCloudagentPostgres, bobCloudAgentContainer]
}

export async function bringUpCharlieDependenciesContainers() {
  const charlieVeritableUIPostgres = await veritableUIPostgresDbContainer(
    'postgres-veritable-ui-charlie',
    { containerPort: 5432, hostPort: 5434 },
    { postgresDb: 'veritable-ui' }
  )
  const charlieVeritableCloudagentPostgres = await veritableCloudagentPostgresContainer(
    'postgres-veritable-cloudagent-charlie',
    { postgresDb: 'postgres-veritable-cloudagent' }
  )
  const charlieCloudagentEnvConfig: VeritableCloudAgentEnvConfig = {
    endpoint: 'ws://veritable-cloudagent-charlie:5003',
    walletId: 'charlie',
    walletKey: 'charlie-key',
    postgresHost: 'postgres-veritable-cloudagent-charlie',
  }
  const charlieCloudAgentContainer = await cloudagentContainer(
    'veritable-cloudagent-charlie',
    {
      containerPort: 3000,
      hostPort: 3102,
    },
    charlieCloudagentEnvConfig
  )
  return [charlieVeritableUIPostgres, charlieVeritableCloudagentPostgres, charlieCloudAgentContainer]
}

export async function composeKeycloakContainer(keycloakDataPath: string): Promise<StartedTestContainer> {
  const keycloakContainer = await new GenericContainer(keycloakVersion)
    .withName('keycloak')
    .withExposedPorts({
      container: 8080,
      host: 3080,
    })
    .withEnvironment({
      KC_BOOTSTRAP_ADMIN_USERNAME: 'admin',
      KC_BOOTSTRAP_ADMIN_PASSWORD: 'admin',
    })
    .withBindMounts([{ source: keycloakDataPath, target: '/opt/keycloak/data/import' }]) //this seems necessary
    .withCommand(['start-dev', '--import-realm'])
    .withWaitStrategy(Wait.forLogMessage('Running the server in development mode'))
    .withNetwork(network)
    .withReuse()
    .start()
  return keycloakContainer
}

export async function composeIpfsContainer(): Promise<StartedTestContainer> {
  const ipfsContainer = await new GenericContainer(kuboVersion)
    .withName('ipfs')
    .withWaitStrategy(Wait.forLogMessage('Gateway server listening on'))
    .withNetwork(network)
    .withReuse()
    .start()
  return ipfsContainer
}

export async function veritableUIPostgresDbContainer(
  name: string,
  exposedPorts: ExposedPortsInterface,
  postgresValues: PostgresValuesInterface
) {
  const { postgresPassword = 'postgres', postgresUser = 'postgres', postgresDb } = postgresValues
  const veritableUIPostgresContainer = await new GenericContainer(postgresVersion)
    .withName(name)
    .withExposedPorts({
      container: exposedPorts.containerPort,
      host: exposedPorts.hostPort,
    })
    .withEnvironment({
      POSTGRES_PASSWORD: postgresPassword,
      POSTGRES_USER: postgresUser,
      POSTGRES_DB: postgresDb,
    })
    .withNetwork(network)
    .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
    .withReuse()
    .start()
  return veritableUIPostgresContainer
}

export async function veritableCloudagentPostgresContainer(
  name: string,
  postgresValues: PostgresValuesInterface
) {
  const { postgresPassword = 'postgres', postgresUser = 'postgres', postgresDb } = postgresValues
  const veritableCloudagentPostgres = await new GenericContainer(postgresVersion)
    .withName(name)
    .withEnvironment({
      POSTGRES_PASSWORD: postgresPassword,
      POSTGRES_USER: postgresUser,
      POSTGRES_DB: postgresDb,
    })
    .withNetwork(network)
    .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
    .withReuse()
    .start()
  return veritableCloudagentPostgres
}

export async function cloudagentContainer(
  name: string,
  exposedPorts: ExposedPortsInterface,
  env: VeritableCloudAgentEnvConfig
) {
  const {
    endpoint,
    walletId,
    walletKey,
    postgresHost,
    postgresPassword = 'postgres',
    postgresUser = 'postgres',
    logLevel = 'trace',
    inboundTransport = '[{"transport": "http", "port": 5002}, {"transport": "ws", "port": 5003}]',
    outboundTransport = 'http,ws',
    adminPort = '3000',
    ipfsOrigin = 'http://ipfs:5001',
    postgresPort = '5432',
    label = 'veritable-cloudagent',
  } = env
  const cloudagentContainer = await new GenericContainer(cloudagentVersion)
    .withName(name)
    .withExposedPorts({
      container: exposedPorts.containerPort,
      host: exposedPorts.hostPort,
    })
    .withEnvironment({
      ENDPOINT: endpoint,
      POSTGRES_HOST: postgresHost,
      WALLET_ID: walletId,
      WALLET_KEY: walletKey,
      LOG_LEVEL: logLevel,
      INBOUND_TRANSPORT: inboundTransport,
      OUTBOUND_TRANSPORT: outboundTransport,
      ADMIN_PORT: adminPort,
      IPFS_ORIGIN: ipfsOrigin,
      POSTGRES_PORT: postgresPort,
      POSTGRES_USERNAME: postgresUser,
      POSTGRES_PASSWORD: postgresPassword,
      LABEL: label,
    })
    .withWaitStrategy(Wait.forListeningPorts())
    .withNetwork(network)
    .withReuse()
    .start()
  return cloudagentContainer
}

// would we ever want to change anything about this?
export async function composeSmtp4dev() {
  const smtp4dev = await new GenericContainer(smtp4devVersion)
    .withName('smtp4dev')
    .withExposedPorts({
      container: 80,
      host: 5001,
    })
    .withExposedPorts({
      container: 25,
      host: 2525,
    })
    .withNetwork(network)
    .withWaitStrategy(Wait.forListeningPorts())
    .withReuse()
    .start()
  return smtp4dev
}
export async function veritableUIContainer(name: string, env: VeritableUIConfig) {
  const { hostPort, invitationFromCompanyNumber, companyProfileApiKey } = env

  const base = await GenericContainer.fromDockerfile('./').build()

  const veritableUIContainer = await base
    .withName('veritable-ui-' + name)
    .withExposedPorts({
      container: 3000,
      host: hostPort,
    })
    .withEnvironment({
      NODE_ENV: 'production',
      LOG_LEVEL: 'trace',
      DB_HOST: 'postgres-veritable-ui-' + name,
      DB_NAME: 'veritable-ui',
      DB_USERNAME: 'postgres',
      DB_PASSWORD: 'postgres',
      DB_PORT: '5432',
      COOKIE_SESSION_KEYS: 'secret',
      PUBLIC_URL: 'http://localhost:3000',
      IDP_CLIENT_ID: 'veritable-ui',
      IDP_PUBLIC_URL_PREFIX: 'http://localhost:3080/realms/veritable/protocol/openid-connect',
      IDP_INTERNAL_URL_PREFIX: 'http://keycloak:8080/realms/veritable/protocol/openid-connect',
      CLOUDAGENT_ADMIN_ORIGIN: 'http://veritable-cloudagent-' + name + ':3000',
      CLOUDAGENT_ADMIN_WS_ORIGIN: 'ws://veritable-cloudagent-' + name + ':3000',
      INVITATION_PIN_SECRET: 'secret',
      INVITATION_FROM_COMPANY_NUMBER: invitationFromCompanyNumber,
      ISSUANCE_DID_POLICY: 'EXISTING_OR_NEW',
      ISSUANCE_SCHEMA_POLICY: 'EXISTING_OR_NEW',
      ISSUANCE_CRED_DEF_POLICY: 'EXISTING_OR_NEW',
      SMTP_HOST: 'smtp4dev',
      SMTP_PASS: '',
      SMTP_PORT: '25',
      SMTP_USER: '',
      EMAIL_TRANSPORT: 'SMTP_EMAIL',
      COMPANY_HOUSE_API_URL: 'https://api.company-information.service.gov.uk',
      DEMO_MODE: 'true',
      SMTP_SECURE: 'false',
      COMPANY_PROFILE_API_KEY: companyProfileApiKey,
    })
    .withCommand([
      'sh',
      '-c',
      'npm i -g pino-colada; node ./node_modules/.bin/knex migrate:latest; npm start | pino-colada',
    ])
    .withWaitStrategy(Wait.forListeningPorts())
    .withNetwork(network)
    .withReuse()
    .start()
  return veritableUIContainer
}
