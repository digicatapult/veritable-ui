import { use } from 'chai'
import 'reflect-metadata'

import chaiJestSnapshot from 'chai-jest-snapshot'
import knex from 'knex'
import { after, before, beforeEach } from 'mocha'
import { StartedTestContainer } from 'testcontainers'
import { RegistryType } from '../src/models/db/types.js'
import { CountryCode } from '../src/models/stringTypes.js'
import { stopContainers } from './helpers/container.js'
import { aliceDbConfig } from './helpers/fixtures.js'
import {
  bringUpDependenciesContainers,
  bringUpSharedContainers,
  bringUpVeritableUIContainer,
  network,
} from './testcontainers/testcontainersSetup.js'

let sharedContainers: StartedTestContainer[]
let aliceDepsContainers: StartedTestContainer[]
let bobDepsContainers: StartedTestContainer[]
let charlieDepsContainers: StartedTestContainer[]
let bobUIContainer: StartedTestContainer[]
let charlieUIContainer: StartedTestContainer[]

before(async function () {
  sharedContainers = await bringUpSharedContainers()
  // Pass in ('name', host port for UI database, host port for cloudagent)
  aliceDepsContainers = await bringUpDependenciesContainers('alice', 5432, 3100)
  bobDepsContainers = await bringUpDependenciesContainers('bob', 5433, 3101)
  charlieDepsContainers = await bringUpDependenciesContainers('charlie', 5434, 3102)
  // Pass in ('name', host port for UI, 'company number', default company registry)
  bobUIContainer = await bringUpVeritableUIContainer('bob', 3001, '04659351')
  charlieUIContainer = await bringUpVeritableUIContainer(
    'charlie',
    3002,
    '3211809',
    'US' as CountryCode,
    'ny_state' as RegistryType
  )

  const database = knex(aliceDbConfig)
  await database.migrate.latest()
  use(chaiJestSnapshot)
  chaiJestSnapshot.resetSnapshotRegistry()
})

beforeEach(function () {
  chaiJestSnapshot.configureUsingMochaContext(this)
})

after(async function () {
  if (process.env.REUSE === 'true') return

  await stopContainers(aliceDepsContainers)
  await stopContainers(bobDepsContainers)
  await stopContainers(charlieDepsContainers)
  await stopContainers(bobUIContainer)
  await stopContainers(charlieUIContainer)
  await stopContainers(sharedContainers)

  await network.stop()
})
