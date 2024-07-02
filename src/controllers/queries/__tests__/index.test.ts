import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'
import { QueriesController } from '../index.js'
import { toHTMLString, withQueriesMocks } from './helpers.js'

describe('QueriesController', () => {
  afterEach(() => {
    sinon.restore()
  })
  describe('queries', () => {
    it('should match the snapshot of the rendered query page', async () => {
      const { mockLogger, queryTemplateMock, dbMock, queryListTemplateMock } = withQueriesMocks()
      const controller = new QueriesController(queryTemplateMock, queryListTemplateMock, dbMock, mockLogger)
      const result = await controller.queries().then(toHTMLString)
      expect(result).to.equal('queries_template')
    })
    it('should call db as expected', async () => {
      const { mockLogger, queryTemplateMock, dbMock, queryListTemplateMock } = withQueriesMocks()
      const controller = new QueriesController(queryTemplateMock, queryListTemplateMock, dbMock, mockLogger)
      const spy = sinon.spy(dbMock, 'get')
      await controller.queryManagement().then(toHTMLString)
      expect(spy.calledWith('query', {}, [['updated_at', 'desc']])).to.equal(true)
    })
    it('should call db as expected', async () => {
      const { mockLogger, queryTemplateMock, dbMock, queryListTemplateMock } = withQueriesMocks()
      const controller = new QueriesController(queryTemplateMock, queryListTemplateMock, dbMock, mockLogger)
      const spy = sinon.spy(dbMock, 'get')
      await controller.queryManagement('VER123').then(toHTMLString)
      const search = 'VER123'
      const query = search ? [['company_name', 'ILIKE', `%${search}%`]] : {}
      expect(spy.calledWith('query', query, [['updated_at', 'desc']])).to.equal(true)
    })
  })
})
