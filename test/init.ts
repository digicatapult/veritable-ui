import { use } from 'chai'
import 'reflect-metadata'

import chaiJestSnapshot from 'chai-jest-snapshot'
import { StartedTestContainer } from 'testcontainers'
import { migrateDatabase } from './helpers/db.js'
import {
  bringUpAliceDependenciesContainers,
  bringUpBobContainers,
  bringUpCharlieContainers,
  bringUpSharedContainers,
} from './testcontainers/testcontainersSetup.js'
let sharedContainers: StartedTestContainer[]
let aliceDepsContainers: StartedTestContainer[]
let bobContainers: StartedTestContainer[]
let charlieContainers: StartedTestContainer[]

before(async function () {
  sharedContainers = await bringUpSharedContainers()
  aliceDepsContainers = await bringUpAliceDependenciesContainers()
  bobContainers = await bringUpBobContainers()
  charlieContainers = await bringUpCharlieContainers()

  await migrateDatabase()
  use(chaiJestSnapshot)
  chaiJestSnapshot.resetSnapshotRegistry()
})

after(async function () {
  await Promise.all(
    aliceDepsContainers.map(async function (container) {
      await container.stop({})
    })
  )
  await Promise.all(
    bobContainers.map(async function (container) {
      await container.stop({})
    })
  )
  await Promise.all(
    charlieContainers.map(async function (container) {
      await container.stop({})
    })
  )
  await Promise.all(
    sharedContainers.map(async function (container) {
      await container.stop({})
    })
  )
})

beforeEach(function () {
  chaiJestSnapshot.configureUsingMochaContext(this)
})
