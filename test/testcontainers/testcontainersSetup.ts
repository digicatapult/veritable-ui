import * as fs from 'node:fs'
import path from 'path'
import { GenericContainer, Network, StartedNetwork, StartedTestContainer, Wait } from 'testcontainers'
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
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
  inboundTransport?: string
  outboundTransport?: string
  adminPort?: string
  ipfsOrigin?: string
  postgresPort?: string
  label?: string
}

interface VeritableUIConfig extends PostgresValuesInterface {
  containerName: string
  dbHost: string
  hostPort: number
  containerPort: number
  postgresPort: string
  idpPublicUrlPrefix: string
  cloudagentAdminOrigin: string
  cloudagentAdminWsOrigin: string
  invitationPinSecret?: string
  invitationFromCompanyNumber: string
  publicUrl: string
  apiSwaggerTitle: string
  apiSwaggerBgColor: string
  companyProfileApiKey: string
  companyHouseApiUrl?: string
  idpInternalUrlPrefix?: string
  smtpHost?: string
  smtpPass?: string
  smtpPort?: string
  smtpUser?: string
  demoMode?: string
  smtpSecure?: string
  emailTransport?: string
  cookieSessionKeys?: string
  idpClientId?: string
  nodeEnv?: 'production' | 'development' | 'test'
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
  issuanceDidPolicy?: string
  issuanceSchemaPolicy?: string
  issuanceCredDefPolicy?: string
}
const network = await new Network().start()

const dockerCompose = fs.readFileSync('./docker-compose.yml', 'utf-8')
const parsed = parse(dockerCompose)
const keycloakVersion = parsed.services.keycloak.image
const postgresVersion = parsed.services['postgres-veritable-ui-alice'].image

export async function bringUpSharedContainers() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)

  const keycloakDataPath = path.resolve(__dirname, '../../docker/keycloak')

  const keycloakContainer = await composeKeycloakContainer(network, keycloakDataPath)
  const ipfsContainer = await composeIpfsContainer(network)
  const smtp4dev = await composeSmtp4dev(network)
  return [keycloakContainer, ipfsContainer, smtp4dev]
}

export async function bringUpAliceUIContainer() {
  const aliceVeritableUIConfig: VeritableUIConfig = {
    containerName: 'veritable-ui-alice',
    dbHost: 'postgres-veritable-ui-alice',
    hostPort: 3000,
    containerPort: 3000,
    postgresPort: '5432',
    idpPublicUrlPrefix:
      process.env.VERITABLE_IDP_PUBLIC_URL_PREFIX || 'http://localhost:3080/realms/veritable/protocol/openid-connect',
    cloudagentAdminOrigin: 'http://veritable-cloudagent-alice:3000',
    cloudagentAdminWsOrigin: 'ws://veritable-cloudagent-alice:3000',
    invitationFromCompanyNumber: '07964699',
    publicUrl: process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000',
    apiSwaggerBgColor: '#ff3131',
    apiSwaggerTitle: 'Alice',
    companyProfileApiKey: process.env.VERITABLE_COMPANY_PROFILE_API_KEY || 'API_KEY',
    postgresDb: 'veritable-ui',
  }
  const aliceVeritableUIContainer = await veritableUIContainer(network, aliceVeritableUIConfig)
  return [aliceVeritableUIContainer]
}

export async function bringUpAlicePlaywrightContainer() {
  const aliceVeritableUIConfig: VeritableUIConfig = {
    containerName: 'veritable-ui-alice',
    dbHost: 'postgres-veritable-ui-alice',
    hostPort: 3000,
    containerPort: 3000,
    postgresPort: '5432',
    idpPublicUrlPrefix:
      process.env.VERITABLE_IDP_PUBLIC_URL_PREFIX || 'http://localhost:3080/realms/veritable/protocol/openid-connect',
    cloudagentAdminOrigin: 'http://veritable-cloudagent-alice:3000',
    cloudagentAdminWsOrigin: 'ws://veritable-cloudagent-alice:3000',
    invitationFromCompanyNumber: '07964699',
    publicUrl: process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000',
    apiSwaggerBgColor: '#ff3131',
    apiSwaggerTitle: 'Alice',
    companyProfileApiKey: process.env.VERITABLE_COMPANY_PROFILE_API_KEY || 'API_KEY',
    postgresDb: 'veritable-ui',
  }
  const aliceVeritableUIContainer = await PlaywrightContainer(network, aliceVeritableUIConfig)
  return [aliceVeritableUIContainer]
}

// Dependencies for Alice, but not her UI container
export async function bringUpAliceDependenciesContainers() {
  const aliceVeritableUIPostgres = await veritableUIPostgresDbContainer(
    network,
    'postgres-veritable-ui-alice',
    { containerPort: 5432, hostPort: 5432 },
    { postgresDb: 'veritable-ui' }
  )
  const aliceVeritableCloudagentPostgres = await veritableCloudagentPostgresContainer(
    network,
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
    network,
    'veritable-cloudagent-alice',
    {
      containerPort: 3000,
      hostPort: 3100,
    },
    aliceCloudagentEnvConfig
  )

  return [aliceVeritableUIPostgres, aliceVeritableCloudagentPostgres, aliceCloudAgentContainer]
}

export async function bringUpBobContainers() {
  const bobVeritableUIPostgres = await veritableUIPostgresDbContainer(
    network,
    'postgres-veritable-ui-bob',
    { containerPort: 5432, hostPort: 5433 },
    { postgresDb: 'veritable-ui' }
  )
  const bobVeritableCloudagentPostgres = await veritableCloudagentPostgresContainer(
    network,
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
    network,
    'veritable-cloudagent-bob',
    {
      containerPort: 3000,
      hostPort: 3101,
    },
    aliceCloudagentEnvConfig
  )
  const bobVeritableUIConfig: VeritableUIConfig = {
    containerName: 'veritable-ui-bob',
    hostPort: 3001,
    containerPort: 3000,
    dbHost: 'postgres-veritable-ui-bob',
    postgresPort: '5432',
    idpPublicUrlPrefix:
      process.env.VERITABLE_IDP_PUBLIC_URL_PREFIX || 'http://localhost:3080/realms/veritable/protocol/openid-connect',
    cloudagentAdminOrigin: 'http://veritable-cloudagent-bob:3000',
    cloudagentAdminWsOrigin: 'ws://veritable-cloudagent-bob:3000',
    invitationFromCompanyNumber: '04659351',
    publicUrl: process.env.VERITABLE_BOB_PUBLIC_URL || 'http://localhost:3001',
    apiSwaggerBgColor: '#ff3131',
    apiSwaggerTitle: 'Bob',
    companyProfileApiKey: process.env.VERITABLE_COMPANY_PROFILE_API_KEY || 'API_KEY',
    postgresDb: 'veritable-ui',
  }
  const bobVeritableUIContainer = await veritableUIContainer(network, bobVeritableUIConfig)
  return [bobVeritableUIPostgres, bobVeritableCloudagentPostgres, bobCloudAgentContainer, bobVeritableUIContainer]
}

export async function bringUpCharlieContainers() {
  const charlieVeritableUIPostgres = await veritableUIPostgresDbContainer(
    network,
    'postgres-veritable-ui-charlie',
    { containerPort: 5432, hostPort: 5434 },
    { postgresDb: 'veritable-ui' }
  )
  const charlieVeritableCloudagentPostgres = await veritableCloudagentPostgresContainer(
    network,
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
    network,
    'veritable-cloudagent-charlie',
    {
      containerPort: 3000,
      hostPort: 3102,
    },
    charlieCloudagentEnvConfig
  )
  const charlieVeritableUIConfig: VeritableUIConfig = {
    containerName: 'veritable-ui-charlie',
    hostPort: 3002,
    containerPort: 3000,
    dbHost: 'postgres-veritable-ui-charlie',
    postgresPort: '5432',
    idpPublicUrlPrefix:
      process.env.VERITABLE_IDP_PUBLIC_URL_PREFIX || 'http://localhost:3080/realms/veritable/protocol/openid-connect',
    cloudagentAdminOrigin: 'http://veritable-cloudagent-charlie:3000',
    cloudagentAdminWsOrigin: 'ws://veritable-cloudagent-charlie:3000',
    invitationFromCompanyNumber: '10016023',
    publicUrl: process.env.VERITABLE_CHARLIE_PUBLIC_URL || 'http://localhost:3002',
    apiSwaggerBgColor: '#ffbd59',
    apiSwaggerTitle: 'Charlie',
    companyProfileApiKey: process.env.VERITABLE_COMPANY_PROFILE_API_KEY || 'API_KEY',
    postgresDb: 'veritable-ui',
  }
  const charlieVeritableUIContainer = await veritableUIContainer(network, charlieVeritableUIConfig)
  return [
    charlieVeritableUIPostgres,
    charlieVeritableCloudagentPostgres,
    charlieCloudAgentContainer,
    charlieVeritableUIContainer,
  ]
}

export async function composeKeycloakContainer(
  network: StartedNetwork,
  keycloakDataPath: string
): Promise<StartedTestContainer> {
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

export async function composeIpfsContainer(network: StartedNetwork): Promise<StartedTestContainer> {
  const ipfsContainer = await new GenericContainer('ipfs/kubo:release')
    .withName('ipfs')
    .withWaitStrategy(Wait.forLogMessage('Gateway server listening on'))
    .withNetwork(network)
    .withReuse()
    .start()
  return ipfsContainer
}

export async function veritableUIPostgresDbContainer(
  network: StartedNetwork,
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
  network: StartedNetwork,
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
  network: StartedNetwork,
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
  const cloudagentContainer = await new GenericContainer('digicatapult/veritable-cloudagent')
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
export async function composeSmtp4dev(network: StartedNetwork) {
  const smtp4dev = await new GenericContainer('rnwood/smtp4dev')
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

export async function veritableUIContainer(network: StartedNetwork, env: VeritableUIConfig) {
  const {
    containerName,
    dbHost,
    containerPort,
    hostPort,
    postgresPort,
    publicUrl,
    idpPublicUrlPrefix,
    invitationFromCompanyNumber,
    cloudagentAdminOrigin,
    cloudagentAdminWsOrigin,
    apiSwaggerTitle,
    apiSwaggerBgColor,
    companyProfileApiKey,
    postgresDb,
    nodeEnv = 'production',
    logLevel = 'trace',
    postgresUser = 'postgres',
    postgresPassword = 'postgres',
    cookieSessionKeys = 'secret',
    idpClientId = 'veritable-ui',
    idpInternalUrlPrefix = 'http://keycloak:8080/realms/veritable/protocol/openid-connect',
    invitationPinSecret = 'secret',
    issuanceDidPolicy = 'EXISTING_OR_NEW',
    issuanceSchemaPolicy = 'EXISTING_OR_NEW',
    issuanceCredDefPolicy = 'EXISTING_OR_NEW',
    smtpHost = 'smtp4dev',
    smtpPass = '',
    smtpPort = '25',
    smtpUser = '',
    emailTransport = 'SMTP_EMAIL',
    companyHouseApiUrl = 'https://api.company-information.service.gov.uk',
    demoMode = 'true',
    smtpSecure = 'false',
  } = env

  const base = await GenericContainer.fromDockerfile('./').build('veritable-ui')

  const veritableUIContainer = await base
    .withName(containerName)
    .withExposedPorts({
      container: containerPort,
      host: hostPort,
    })
    .withEnvironment({
      NODE_ENV: nodeEnv,
      LOG_LEVEL: logLevel,
      DB_HOST: dbHost,
      DB_NAME: postgresDb,
      DB_USERNAME: postgresUser,
      DB_PASSWORD: postgresPassword,
      DB_PORT: postgresPort,
      COOKIE_SESSION_KEYS: cookieSessionKeys,
      PUBLIC_URL: publicUrl,
      IDP_CLIENT_ID: idpClientId,
      IDP_PUBLIC_URL_PREFIX: idpPublicUrlPrefix,
      IDP_INTERNAL_URL_PREFIX: idpInternalUrlPrefix,
      CLOUDAGENT_ADMIN_ORIGIN: cloudagentAdminOrigin,
      CLOUDAGENT_ADMIN_WS_ORIGIN: cloudagentAdminWsOrigin,
      INVITATION_PIN_SECRET: invitationPinSecret,
      INVITATION_FROM_COMPANY_NUMBER: invitationFromCompanyNumber,
      ISSUANCE_DID_POLICY: issuanceDidPolicy,
      ISSUANCE_SCHEMA_POLICY: issuanceSchemaPolicy,
      ISSUANCE_CRED_DEF_POLICY: issuanceCredDefPolicy,
      SMTP_HOST: smtpHost,
      SMTP_PASS: smtpPass,
      SMTP_PORT: smtpPort,
      SMTP_USER: smtpUser,
      EMAIL_TRANSPORT: emailTransport,
      API_SWAGGER_TITLE: apiSwaggerTitle,
      API_SWAGGER_BG_COLOR: apiSwaggerBgColor,
      COMPANY_HOUSE_API_URL: companyHouseApiUrl,
      DEMO_MODE: demoMode,
      SMTP_SECURE: smtpSecure,
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

export async function PlaywrightContainer(network: StartedNetwork, env: VeritableUIConfig) {
  const {
    containerName,
    dbHost,
    containerPort,
    hostPort,
    postgresPort,
    publicUrl,
    idpPublicUrlPrefix,
    invitationFromCompanyNumber,
    cloudagentAdminOrigin,
    cloudagentAdminWsOrigin,
    apiSwaggerTitle,
    apiSwaggerBgColor,
    companyProfileApiKey,
    postgresDb,
    nodeEnv = 'production',
    logLevel = 'trace',
    postgresUser = 'postgres',
    postgresPassword = 'postgres',
    cookieSessionKeys = 'secret',
    idpClientId = 'veritable-ui',
    idpInternalUrlPrefix = 'http://keycloak:8080/realms/veritable/protocol/openid-connect',
    invitationPinSecret = 'secret',
    issuanceDidPolicy = 'EXISTING_OR_NEW',
    issuanceSchemaPolicy = 'EXISTING_OR_NEW',
    issuanceCredDefPolicy = 'EXISTING_OR_NEW',
    smtpHost = 'smtp4dev',
    smtpPass = '',
    smtpPort = '25',
    smtpUser = '',
    emailTransport = 'SMTP_EMAIL',
    companyHouseApiUrl = 'https://api.company-information.service.gov.uk',
    demoMode = 'true',
    smtpSecure = 'false',
  } = env

  const playwright = await GenericContainer.fromDockerfile('.', 'Playwright.dockerfile').build('playwright')

  const playwrightContainer = await playwright
    .withName(containerName)
    .withExposedPorts({
      container: containerPort,
      host: hostPort,
    })
    .withEnvironment({
      NODE_ENV: nodeEnv,
      LOG_LEVEL: logLevel,
      DB_HOST: dbHost,
      DB_NAME: postgresDb,
      DB_USERNAME: postgresUser,
      DB_PASSWORD: postgresPassword,
      DB_PORT: postgresPort,
      COOKIE_SESSION_KEYS: cookieSessionKeys,
      PUBLIC_URL: publicUrl,
      IDP_CLIENT_ID: idpClientId,
      IDP_PUBLIC_URL_PREFIX: idpPublicUrlPrefix,
      IDP_INTERNAL_URL_PREFIX: idpInternalUrlPrefix,
      CLOUDAGENT_ADMIN_ORIGIN: cloudagentAdminOrigin,
      CLOUDAGENT_ADMIN_WS_ORIGIN: cloudagentAdminWsOrigin,
      INVITATION_PIN_SECRET: invitationPinSecret,
      INVITATION_FROM_COMPANY_NUMBER: invitationFromCompanyNumber,
      ISSUANCE_DID_POLICY: issuanceDidPolicy,
      ISSUANCE_SCHEMA_POLICY: issuanceSchemaPolicy,
      ISSUANCE_CRED_DEF_POLICY: issuanceCredDefPolicy,
      SMTP_HOST: smtpHost,
      SMTP_PASS: smtpPass,
      SMTP_PORT: smtpPort,
      SMTP_USER: smtpUser,
      EMAIL_TRANSPORT: emailTransport,
      API_SWAGGER_TITLE: apiSwaggerTitle,
      API_SWAGGER_BG_COLOR: apiSwaggerBgColor,
      COMPANY_HOUSE_API_URL: companyHouseApiUrl,
      DEMO_MODE: demoMode,
      SMTP_SECURE: smtpSecure,
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
  return playwrightContainer
}
