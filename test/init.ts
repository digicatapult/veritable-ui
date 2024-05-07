import 'reflect-metadata'

import chaiJestSnapshot from 'chai-jest-snapshot'

before(async function () {
  let chai = await import('chai')
  chai.use(chaiJestSnapshot)
  chaiJestSnapshot.resetSnapshotRegistry()
})

beforeEach(function () {
  chaiJestSnapshot.configureUsingMochaContext(this)
})
