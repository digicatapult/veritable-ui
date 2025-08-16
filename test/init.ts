import { use } from 'chai'
import 'reflect-metadata'

import chaiJestSnapshot from 'chai-jest-snapshot'
import knex from 'knex'
import { StartedTestContainer, StoppedTestContainer } from 'testcontainers'
import { aliceDbConfig } from './helpers/fixtures.js'
import {
  bringUpDependenciesContainers,
  bringUpSharedContainers,
  bringUpVeritableUIContainer,
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
  charlieUIContainer = await bringUpVeritableUIContainer('charlie', 3002, '3211809', 'US')

  const database = knex(aliceDbConfig)
  await database.migrate.latest()
  use(chaiJestSnapshot)
  chaiJestSnapshot.resetSnapshotRegistry()
})

beforeEach(function () {
  chaiJestSnapshot.configureUsingMochaContext(this)
})

after(async function () {
  // Gather all containers into a single array
  const allContainers = [
    ...aliceDepsContainers,
    ...bobDepsContainers,
    ...charlieDepsContainers,
    ...bobUIContainer,
    ...charlieUIContainer,
    ...sharedContainers,
  ]

  // Stop all containers in parallel
  const results = await Promise.allSettled(allContainers.map((container) => container.stop()))

  // Process results
  const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map((r) => r.reason)
  if (rejected.length > 0) {
    throw new Error(`${rejected.length} container shutdown unsuccessful with error: ${rejected[0]}`)
  }
})
