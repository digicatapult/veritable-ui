import { use } from 'chai'

import chaiJestSnapshot from 'chai-jest-snapshot'

before(async function () {
  use(chaiJestSnapshot)
  chaiJestSnapshot.resetSnapshotRegistry()
})

beforeEach(function () {
  chaiJestSnapshot.configureUsingMochaContext(this)
})
