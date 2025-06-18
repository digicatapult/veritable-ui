import { use } from 'chai'
import 'reflect-metadata'

import chaiJestSnapshot from 'chai-jest-snapshot'
import { StartedTestContainer } from 'testcontainers'
import { migrateDatabase } from './helpers/db.js'
import {
  bringUpAliceDependenciesContainers,
  bringUpBobDependenciesContainers,
  bringUpBobUIContainer,
  bringUpCharlieDependenciesContainers,
  bringUpCharlieUIContainer,
  bringUpSharedContainers,
} from './testcontainers/testcontainersSetup.js'

let sharedContainers: StartedTestContainer[]
let aliceDepsContainers: StartedTestContainer[]
let bobDepsContainers: StartedTestContainer[]
let charlieDepsContainers: StartedTestContainer[]
let bobUIContainer: StartedTestContainer[]
let charlieUIContainer: StartedTestContainer[]

before(async function () {
  sharedContainers = await bringUpSharedContainers()
  aliceDepsContainers = await bringUpAliceDependenciesContainers()
  bobDepsContainers = await bringUpBobDependenciesContainers()
  charlieDepsContainers = await bringUpCharlieDependenciesContainers()
  bobUIContainer = await bringUpBobUIContainer()
  charlieUIContainer = await bringUpCharlieUIContainer()

  await migrateDatabase()
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
