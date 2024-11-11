import { use } from 'chai'
import 'reflect-metadata'

import chaiJestSnapshot from 'chai-jest-snapshot'
import { StartedTestContainer } from 'testcontainers'
import { bringUpAllContainers } from './testcontainers/testcontainersSetup'
let containers: StartedTestContainer[]

before(async function () {
  containers = await bringUpAllContainers()
  // helper for migrating db
  use(chaiJestSnapshot)
  chaiJestSnapshot.resetSnapshotRegistry()
})

// after(async function () {
//   await Promise.all(
//     containers.map(async function (container) {
//       await container.stop({ remove: false })
//     })
//   )
// })

beforeEach(function () {
  chaiJestSnapshot.configureUsingMochaContext(this)
})
