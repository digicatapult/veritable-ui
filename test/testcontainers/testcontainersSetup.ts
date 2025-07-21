import * as fs from 'node:fs'
import path from 'path'
import { GenericContainer, Network, StartedTestContainer, Wait } from 'testcontainers'
import { fileURLToPath } from 'url'
import { parse } from 'yaml'

//============ Start Network ============

const network = await new Network().start()

//============ Image Version Control ============

const dockerCompose = fs.readFileSync('./docker-compose.yml', 'utf-8')
const parsed = parse(dockerCompose)
const keycloakVersion = parsed.services.keycloak.image
const postgresVersion = parsed.services['postgres-veritable-ui-alice'].image
const cloudagentVersion = parsed.services['veritable-cloudagent-alice'].image
const kuboVersion = parsed.services.ipfs.image
const smtp4devVersion = parsed.services.smtp4dev.image
const wireMockVersion = parsed.services.wiremock.image

//============ Veritable UI Container ============

export async function bringUpVeritableUIContainer(
  name: string,
  hostPort: number,
  invitationFromCompanyNumber: string,
  localRegistryToUse: string = 'GB'
) {
  const base = await GenericContainer.fromDockerfile('./').build()

  const veritableUIContainer = await base
    .withName(`veritable-ui-${name}`)
    .withExposedPorts({
      container: 3000,
      host: hostPort,
    })
    .withEnvironment({
      NODE_ENV: 'production',
      LOG_LEVEL: 'trace',
      DB_HOST: `postgres-veritable-ui-${name}`,
      DB_NAME: 'veritable-ui',
      DB_USERNAME: 'postgres',
      DB_PASSWORD: 'postgres',
      DB_PORT: '5432',
      COOKIE_SESSION_KEYS: 'secret',
      PUBLIC_URL: `http://localhost:${hostPort}`,
      IDP_CLIENT_ID: 'veritable-ui',
      IDP_PUBLIC_URL_PREFIX: 'http://localhost:3080/realms/veritable/protocol/openid-connect',
      IDP_INTERNAL_URL_PREFIX: 'http://keycloak:8080/realms/veritable/protocol/openid-connect',
      CLOUDAGENT_ADMIN_ORIGIN: `http://veritable-cloudagent-${name}:3000`,
      CLOUDAGENT_ADMIN_WS_ORIGIN: `ws://veritable-cloudagent-${name}:3000`,
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
      COMPANY_HOUSE_API_URL: 'http://wiremock:8080',
      DEMO_MODE: 'true',
      SMTP_SECURE: 'false',
      COMPANY_PROFILE_API_KEY: 'API_KEY',
      SOCRATA_API_URL: 'http://wiremock-socrata:8080',
      LOCAL_REGISTRY_TO_USE: localRegistryToUse,
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
  return [veritableUIContainer]
}

//============ Dependency Containers ============

export async function bringUpDependenciesContainers(name: string, dbPort: number, cloudagentPort: number) {
  const veritableUIPostgres = await veritableUIPostgresDbContainer(name, dbPort)
  const veritableCloudagentPostgres = await veritableCloudagentPostgresContainer(name)
  const cloudAgentContainer = await cloudagentContainer(name, cloudagentPort)
  return [veritableUIPostgres, veritableCloudagentPostgres, cloudAgentContainer]
}

export async function veritableUIPostgresDbContainer(name: string, hostPort: number): Promise<StartedTestContainer> {
  const veritableUIPostgresContainer = await new GenericContainer(postgresVersion)
    .withName(`postgres-veritable-ui-${name}`)
    .withExposedPorts({
      container: 5432,
      host: hostPort,
    })
    .withEnvironment({
      POSTGRES_PASSWORD: 'postgres',
      POSTGRES_USER: 'postgres',
      POSTGRES_DB: 'veritable-ui',
    })
    .withNetwork(network)
    .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
    .withReuse()
    .start()
  return veritableUIPostgresContainer
}

export async function veritableCloudagentPostgresContainer(name: string): Promise<StartedTestContainer> {
  const veritableCloudagentPostgres = await new GenericContainer(postgresVersion)
    .withName(`postgres-veritable-cloudagent-${name}`)
    .withEnvironment({
      POSTGRES_PASSWORD: 'postgres',
      POSTGRES_USER: 'postgres',
      POSTGRES_DB: 'postgres-veritable-cloudagent',
    })
    .withNetwork(network)
    .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
    .withReuse()
    .start()
  return veritableCloudagentPostgres
}

export async function cloudagentContainer(name: string, hostPort: number): Promise<StartedTestContainer> {
  const cloudagentContainer = await new GenericContainer(cloudagentVersion)
    .withName(`veritable-cloudagent-${name}`)
    .withExposedPorts({
      container: 3000,
      host: hostPort,
    })
    .withEnvironment({
      ENDPOINT: `ws://veritable-cloudagent-${name}:5003`,
      POSTGRES_HOST: `postgres-veritable-cloudagent-${name}`,
      WALLET_ID: name,
      WALLET_KEY: `${name}-key`,
      LOG_LEVEL: 'trace',
      INBOUND_TRANSPORT: '[{"transport": "http", "port": 5002}, {"transport": "ws", "port": 5003}]',
      OUTBOUND_TRANSPORT: 'http,ws',
      ADMIN_PORT: '3000',
      IPFS_ORIGIN: 'http://ipfs:5001',
      POSTGRES_PORT: '5432',
      POSTGRES_USERNAME: 'postgres',
      POSTGRES_PASSWORD: 'postgres',
      LABEL: 'veritable-cloudagent',
    })
    .withWaitStrategy(Wait.forListeningPorts())
    .withNetwork(network)
    .withReuse()
    .start()
  return cloudagentContainer
}

//============ Shared Containers ============

export async function bringUpSharedContainers() {
  const keycloakContainer = await composeKeycloakContainer()
  const ipfsContainer = await composeIpfsContainer()
  const smtp4dev = await composeSmtp4dev()
  const wiremockContainer = await wireMockContainer()
  const wiremockSocrataContainerInstance = await wireMockSocrataContainer()
  return [keycloakContainer, ipfsContainer, smtp4dev, wiremockContainer, wiremockSocrataContainerInstance]
}

export async function composeKeycloakContainer(): Promise<StartedTestContainer> {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const keycloakDataPath = path.resolve(__dirname, '../../docker/keycloak')
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

export async function composeSmtp4dev(): Promise<StartedTestContainer> {
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

export async function wireMockContainer(): Promise<StartedTestContainer> {
  const mappings = fs.readFileSync('./test/wiremock/company-house/mappings.json', 'utf-8')
  const container = await new GenericContainer(wireMockVersion)
    .withName('wiremock')
    .withExposedPorts({
      container: 8080,
      host: 8443,
    })
    .withCopyContentToContainer([
      {
        content: mappings,
        target: '/home/wiremock/mappings/mappings.json',
      },
    ])
    .withWaitStrategy(Wait.forLogMessage('response-template,webhook'))
    .withNetwork(network)
    .start()
  return container
}

export async function wireMockSocrataContainer(): Promise<StartedTestContainer> {
  const mappings = fs.readFileSync('./test/wiremock/socrata/mappings.json', 'utf-8')
  const container = await new GenericContainer(wireMockVersion)
    .withName('wiremock-socrata')
    .withExposedPorts({
      container: 8080,
      host: 8444,
    })
    .withCopyContentToContainer([
      {
        content: mappings,
        target: '/home/wiremock/mappings/mappings.json',
      },
    ])
    .withWaitStrategy(Wait.forLogMessage('response-template,webhook'))
    .withNetwork(network)
    .start()
  return container
}
