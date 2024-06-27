import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import { QueriesController } from '../index.js'
import { withQueriesMocks } from './helpers.js'

describe('QueriesController', () => {
  afterEach(() => {
    sinon.restore()
  })
  describe('queries', () => {
    it('should match the snapshot of the rendered query page', async () => {
      const { mockLogger, templateMock } = withQueriesMocks()
      const controller = new QueriesController(templateMock, mockLogger)

      const result = await controller.queries()

      expect(result).to.matchSnapshot()
    })
  })
})
