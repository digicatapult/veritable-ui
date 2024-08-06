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
      const {
        scope3CarbonConsumptionTemplateMock,
        scope3CarbonConsumptionResponseTemplateMock,
        mockLogger,
        queryTemplateMock,
        dbMock,
        queryListTemplateMock,
      } = withQueriesMocks()
      const controller = new QueriesController(
        scope3CarbonConsumptionTemplateMock,
        scope3CarbonConsumptionResponseTemplateMock,
        queryTemplateMock,
        queryListTemplateMock,
        dbMock,
        mockLogger
      )
      const result = await controller.queries().then(toHTMLString)
      expect(result).to.equal('queries_template')
    })
    it('should call db as expected', async () => {
      const {
        scope3CarbonConsumptionTemplateMock,
        scope3CarbonConsumptionResponseTemplateMock,
        mockLogger,
        queryTemplateMock,
        dbMock,
        queryListTemplateMock,
      } = withQueriesMocks()
      const controller = new QueriesController(
        scope3CarbonConsumptionTemplateMock,
        scope3CarbonConsumptionResponseTemplateMock,
        queryTemplateMock,
        queryListTemplateMock,
        dbMock,
        mockLogger
      )
      const spy = sinon.spy(dbMock, 'get')
      await controller.queryManagement().then(toHTMLString)
      expect(spy.firstCall.calledWith('connection', {}, [['updated_at', 'desc']])).to.equal(true)
      expect(spy.secondCall.calledWith('query', {}, [['updated_at', 'desc']])).to.equal(true)
    })
    it('should call db as expected', async () => {
      const {
        scope3CarbonConsumptionTemplateMock,
        scope3CarbonConsumptionResponseTemplateMock,
        mockLogger,
        queryTemplateMock,
        dbMock,
        queryListTemplateMock,
      } = withQueriesMocks()
      const controller = new QueriesController(
        scope3CarbonConsumptionTemplateMock,
        scope3CarbonConsumptionResponseTemplateMock,
        queryTemplateMock,
        queryListTemplateMock,
        dbMock,
        mockLogger
      )
      const spy = sinon.spy(dbMock, 'get')
      await controller.queryManagement('VER123').then(toHTMLString)
      const search = 'VER123'
      const query = search ? [['company_name', 'ILIKE', `%${search}%`]] : {}
      expect(spy.firstCall.calledWith('connection', query, [['updated_at', 'desc']])).to.equal(true)

      expect(spy.secondCall.calledWith('query', {}, [['updated_at', 'desc']])).to.equal(true)
    })
    it('should call db as expected', async () => {
      const {
        scope3CarbonConsumptionTemplateMock,
        scope3CarbonConsumptionResponseTemplateMock,
        mockLogger,
        queryTemplateMock,
        dbMock,
        queryListTemplateMock,
      } = withQueriesMocks()
      const controller = new QueriesController(
        scope3CarbonConsumptionTemplateMock,
        scope3CarbonConsumptionResponseTemplateMock,
        queryTemplateMock,
        queryListTemplateMock,
        dbMock,
        mockLogger
      )
      const spy = sinon.spy(dbMock, 'get')
      await controller.scope3CarbonConsumption().then(toHTMLString)
      expect(spy.firstCall.calledWith('connection', {}, [['updated_at', 'desc']])).to.equal(true)
    })
    it('should call db as expected', async () => {
      const {
        scope3CarbonConsumptionTemplateMock,
        scope3CarbonConsumptionResponseTemplateMock,
        mockLogger,
        queryTemplateMock,
        dbMock,
        queryListTemplateMock,
      } = withQueriesMocks()
      const controller = new QueriesController(
        scope3CarbonConsumptionTemplateMock,
        scope3CarbonConsumptionResponseTemplateMock,
        queryTemplateMock,
        queryListTemplateMock,
        dbMock,
        mockLogger
      )
      const spy = sinon.spy(dbMock, 'get')
      await controller.scope3CarbonConsumption('VER123').then(toHTMLString)
      const search = 'VER123'
      const query = search ? [['company_name', 'ILIKE', `%${search}%`]] : {}
      expect(spy.firstCall.calledWith('connection', query, [['updated_at', 'desc']])).to.equal(true)
    })
    it('should call page with stage FORM as expected', async () => {
      const {
        scope3CarbonConsumptionTemplateMock,
        scope3CarbonConsumptionResponseTemplateMock,
        mockLogger,
        queryTemplateMock,
        dbMock,
        queryListTemplateMock,
      } = withQueriesMocks()
      const controller = new QueriesController(
        scope3CarbonConsumptionTemplateMock,
        scope3CarbonConsumptionResponseTemplateMock,
        queryTemplateMock,
        queryListTemplateMock,
        dbMock,
        mockLogger
      )
      const result = await controller
        .scope3CarbonConsumptionStage({ companyNumber: '10000009', action: 'form' })
        .then(toHTMLString)

      expect(result).to.equal('queries_template')
    })
    it('should call page with stage SUCCESS as expected', async () => {
      const {
        scope3CarbonConsumptionTemplateMock,
        scope3CarbonConsumptionResponseTemplateMock,
        mockLogger,
        queryTemplateMock,
        dbMock,
        queryListTemplateMock,
      } = withQueriesMocks()
      const controller = new QueriesController(
        scope3CarbonConsumptionTemplateMock,
        scope3CarbonConsumptionResponseTemplateMock,
        queryTemplateMock,
        queryListTemplateMock,
        dbMock,
        mockLogger
      )
      const result = await controller
        .scope3CarbonConsumptionStage({
          companyNumber: '10000009',
          action: 'success',
          productId: 'SomeID',
          quantity: 111,
        })
        .then(toHTMLString)

      expect(result).to.equal('queries_template')
    })
  })
})
