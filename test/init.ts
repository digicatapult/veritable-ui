import { use } from 'chai'
import 'reflect-metadata'

import chaiJestSnapshot from 'chai-jest-snapshot'
import { migrateDatabase } from './helpers/db.js'
import {
  bringUpAliceDependenciesContainers,
  bringUpBobContainers,
  bringUpCharlieContainers,
  bringUpSharedContainers,
} from './testcontainers/testcontainersSetup.js'

before(async function () {
  await bringUpSharedContainers()
  await bringUpAliceDependenciesContainers()
  await bringUpBobContainers()
  await bringUpCharlieContainers()

  await migrateDatabase()
  use(chaiJestSnapshot)
  chaiJestSnapshot.resetSnapshotRegistry()
})

// do we want to keep this for debugging?
after(async function () {
  // await Promise.all(
  //   aliceDepsContainers.map(async function (container) {
  //     await container.stop({ remove: false })
  //   })
  // )
  // await Promise.all(
  //   bobContainers.map(async function (container) {
  //     await container.stop({ remove: false })
  //   })
  // )
  // await Promise.all(
  //   charlieContainers.map(async function (container) {
  //     await container.stop({ remove: false })
  //   })
  // )
  // await Promise.all(
  //   sharedContainers.map(async function (container) {
  //     await container.stop({ remove: false })
  //   })
  // )
})

beforeEach(function () {
  chaiJestSnapshot.configureUsingMochaContext(this)
})
