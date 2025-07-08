import { use } from 'chai'
import 'reflect-metadata'

import chaiJestSnapshot from 'chai-jest-snapshot'
import knex from 'knex'
import { StartedTestContainer } from 'testcontainers'
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
  // Pass in ('name', host port for UI, 'company number')
  bobUIContainer = await bringUpVeritableUIContainer('bob', 3001, '04659351')
  charlieUIContainer = await bringUpVeritableUIContainer('charlie', 3002, '10016023')

  const database = knex(aliceDbConfig)
  await database.migrate.latest()
  use(chaiJestSnapshot)
  chaiJestSnapshot.resetSnapshotRegistry()
})

after(async function () {
  await Promise.all(
    aliceDepsContainers.map(async function (container) {
      await container.stop()
    })
  )
  await Promise.all(
    bobDepsContainers.map(async function (container) {
      await container.stop()
    })
  )
  await Promise.all(
    charlieDepsContainers.map(async function (container) {
      await container.stop()
    })
  )
  await Promise.all(
    bobUIContainer.map(async function (container) {
      await container.stop()
    })
  )
  await Promise.all(
    charlieUIContainer.map(async function (container) {
      await container.stop()
    })
  )
  await Promise.all(
    sharedContainers.map(async function (container) {
      await container.stop()
    })
  )
})

beforeEach(function () {
  chaiJestSnapshot.configureUsingMochaContext(this)
})
