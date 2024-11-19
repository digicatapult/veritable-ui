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

beforeEach(function () {
  chaiJestSnapshot.configureUsingMochaContext(this)
})
