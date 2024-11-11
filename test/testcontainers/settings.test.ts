import { expect } from 'chai'
import path from 'path'
import { fileURLToPath } from 'url'

import { GenericContainer, Network, Wait } from 'testcontainers'
import { fetchGet } from '../helpers/routeHelper.js'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('integration tests for settings page', function () {
  let aliceVeritableUIPostgres
  let aliceVeritableCloudagentPostgres
  let smtp4dev
  let cloudAgentContainer
  let ipfsContainer
  let keycloakContainer
  let aliceVeritableUIContainer
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)

  const keycloakDataPath = path.resolve(__dirname, '../../docker/keycloak')

  console.log('here')
  before(async () => {
    console.log('before all')
    const network = await new Network().start()
    keycloakContainer = await new GenericContainer('quay.io/keycloak/keycloak:26.0.5')
      .withName('keycloak')
      .withExposedPorts({
        container: 8080,
        host: 3080,
      })
      .withEnvironment({
        KEYCLOAK_ADMIN: 'admin',
        KEYCLOAK_ADMIN_PASSWORD: 'admin',
      })
      .withBindMounts([{ source: keycloakDataPath, target: '/opt/keycloak/data/import' }])
      .withCommand(['start-dev', '--import-realm'])
      .withWaitStrategy(Wait.forLogMessage('Running the server in development mode'))
      .withNetwork(network)
      .start()
    const keycloakPort = keycloakContainer.getMappedPort(8080)
    console.log(`Keycloak container started on port ${keycloakPort}`)

    ipfsContainer = await new GenericContainer('ipfs/kubo:release')
      .withName('ipfs')
      // .withTmpFs({ '/var/lib/ipfs/data': 'rw' })
      .withWaitStrategy(Wait.forLogMessage('Gateway server listening on'))
      .withNetwork(network)
      .start()

    console.log(`IPFS container started`)

    // change to rel path
    aliceVeritableUIPostgres = await new GenericContainer('postgres:17.0-alpine')
      .withName('postgres-veritable-ui-alice')
      // .withBindMounts([
      //   { source: '/var/lib/docker/volumes/postgres-veritable-ui-alice/_data', target: '/var/lib/postgresql/data' },
      // ])
      .withExposedPorts({
        container: 5432,
        host: 5432,
      })
      .withEnvironment({ POSTGRES_PASSWORD: 'postgres', POSTGRES_USER: 'postgres', POSTGRES_DB: 'veritable-ui' })
      .withNetwork(network)
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
      .start()

    console.log(`Alice UI postgres  container started on port ${aliceVeritableUIPostgres.getMappedPort(5432)}`)

    aliceVeritableCloudagentPostgres = await new GenericContainer('postgres:17.0-alpine')
      .withName('postgres-veritable-cloudagent-alice')
      // .withBindMounts([
      //   {
      //     source: '/var/lib/docker/volumes/postgres-veritable-cloudagent-alice/_data',
      //     target: '/var/lib/postgresql/data',
      //   },
      // ])
      .withEnvironment({
        POSTGRES_PASSWORD: 'postgres',
        POSTGRES_USER: 'postgres',
        POSTGRES_DB: 'postgres-veritable-cloudagent',
      })
      .withNetwork(network)
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
      .start()
    console.log(`Alice cloudagent postgres  container started `)

    cloudAgentContainer = await new GenericContainer('digicatapult/veritable-cloudagent')
      .withName('veritable-cloudagent-alice')
      .withExposedPorts({
        container: 3000,
        host: 3100,
      })
      .withEnvironment({
        ENDPOINT: 'ws://veritable-cloudagent-alice:5003',
        POSTGRES_HOST: 'postgres-veritable-cloudagent-alice',
        WALLET_ID: 'alice',
        WALLET_KEY: 'alice-key',
        LOG_LEVEL: 'debug',
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
      .start()

    console.log(`Alice Cloudagent container started on port ${cloudAgentContainer.getMappedPort(3000)}`)

    smtp4dev = await new GenericContainer('rnwood/smtp4dev')
      .withName('smtp4dev')
      .withExposedPorts({
        container: 80,
        host: 5001, // Host port for accessing the web interface
      })
      .withExposedPorts({
        container: 25,
        host: 2525, // Host port for SMTP connections
      })
      .withNetwork(network)
      .withWaitStrategy(Wait.forListeningPorts())
      .start()
    console.log(`Smtp4dev started on  ${smtp4dev.getMappedPort(80)}`)

    const alicebase = await GenericContainer.fromDockerfile('./').withTarget('test').build()
    console.log('after build')
    aliceVeritableUIContainer = await alicebase
      .withName('veritable-ui-alice')
      .withLogConsumer((stream) => {
        stream.on('data', (line) => console.log(line))
        stream.on('err', (line) => console.error(line))
        stream.on('end', () => console.log('Stream closed'))
      })
      .withExposedPorts({
        container: 3000,
        host: 3000,
      })
      .withEnvironment({
        NODE_ENV: 'production',
        LOG_LEVEL: 'debug',
        DB_HOST: 'postgres-veritable-ui-alice',
        DB_NAME: 'veritable-ui',
        DB_USERNAME: 'postgres',
        DB_PASSWORD: 'postgres',
        DB_PORT: aliceVeritableUIPostgres.getMappedPort(5432).toString(),
        COOKIE_SESSION_KEYS: 'secret',
        PUBLIC_URL: process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000',
        IDP_CLIENT_ID: 'veritable-ui',
        IDP_PUBLIC_URL_PREFIX:
          process.env.VERITABLE_IDP_PUBLIC_URL_PREFIX ||
          'http://localhost:3080/realms/veritable/protocol/openid-connect',
        IDP_INTERNAL_URL_PREFIX: 'http://keycloak:8080/realms/veritable/protocol/openid-connect',
        CLOUDAGENT_ADMIN_ORIGIN: 'http://veritable-cloudagent-alice:3000',
        CLOUDAGENT_ADMIN_WS_ORIGIN: 'ws://veritable-cloudagent-alice:3000',
        INVITATION_PIN_SECRET: 'secret',
        INVITATION_FROM_COMPANY_NUMBER: '07964699',
        ISSUANCE_DID_POLICY: 'EXISTING_OR_NEW',
        ISSUANCE_SCHEMA_POLICY: 'EXISTING_OR_NEW',
        ISSUANCE_CRED_DEF_POLICY: 'EXISTING_OR_NEW',
        SMTP_HOST: 'smtp4dev',
        SMTP_PASS: '',
        SMTP_PORT: '25',
        SMTP_USER: '',
        EMAIL_TRANSPORT: 'SMTP_EMAIL',
        API_SWAGGER_TITLE: 'Alice',
        API_SWAGGER_BG_COLOR: '#ff3131',
        COMPANY_HOUSE_API_URL: 'https://api.company-information.service.gov.uk',
        DEMO_MODE: 'true',
        SMTP_SECURE: 'false',
        COMPANY_PROFILE_API_KEY: process.env.VERITABLE_COMPANY_PROFILE_API_KEY || 'API_KEY',
      })
      .withCommand([
        'sh',
        '-c',
        'npm i -g pino-colada; node ./node_modules/.bin/knex migrate:latest; npm start | pino-colada',
      ])
      .withWaitStrategy(Wait.forListeningPorts())
      .withNetwork(network)
      .start()

    const veritableUIPort = aliceVeritableUIContainer.getMappedPort(3000)
    console.log(`Veritable UI Alice container started on port ${veritableUIPort}`)
  })

  after(async () => {
    await ipfsContainer.stop({ remove: false })
    await aliceVeritableUIPostgres.stop({ remove: false })
    await aliceVeritableCloudagentPostgres.stop({ remove: false })
    await aliceVeritableUIContainer.stop({ remove: false })
    await smtp4dev.stop({ remove: false })
  })

  it('returns success', async function () {
    const baseUrlAlice = process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000'
    console.log('in the actual test')
    await delay(3000)
    console.log('after delay')
    const response = await fetchGet(`${baseUrlAlice}/settings`)
    console.log(response)
    expect(response.status).to.equal(200)

    console.log('in test')
  })
})
