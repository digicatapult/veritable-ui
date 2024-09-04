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
      const { args } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const result = await controller.queries().then(toHTMLString)
      expect(result).to.equal('queries_template')
    })
    it('should call db as expected', async () => {
      const { dbMock, args } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const spy = dbMock.get
      await controller.queryManagement().then(toHTMLString)
      expect(spy.firstCall.calledWith('connection', [], [['updated_at', 'desc']])).to.equal(true)
      expect(spy.secondCall.calledWith('query', {}, [['updated_at', 'desc']])).to.equal(true)
    })
    it('should call db as expected', async () => {
      const { dbMock, args } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const spy = dbMock.get
      await controller.queryManagement('VER123').then(toHTMLString)
      const search = 'VER123'
      const query = search ? [['company_name', 'ILIKE', `%${search}%`]] : {}
      expect(spy.firstCall.calledWith('connection', query, [['updated_at', 'desc']])).to.equal(true)

      expect(spy.secondCall.calledWith('query', {}, [['updated_at', 'desc']])).to.equal(true)
    })

    it('should call db as expected', async () => {
      const { dbMock, args } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const spy = dbMock.get
      await controller.scope3CarbonConsumption().then(toHTMLString)
      expect(spy.firstCall.calledWith('connection', [], [['updated_at', 'desc']])).to.equal(true)
    })

    it('should call db as expected', async () => {
      const { dbMock, args } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const spy = dbMock.get
      await controller.scope3CarbonConsumption('VER123').then(toHTMLString)
      const search = 'VER123'
      const query = search ? [['company_name', 'ILIKE', `%${search}%`]] : {}
      expect(spy.firstCall.calledWith('connection', query, [['updated_at', 'desc']])).to.equal(true)
    })

    it('should call page with stage FORM as expected', async () => {
      const { args } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const result = await controller
        .scope3CarbonConsumptionStage({ connectionId: 'connection-id', action: 'form' })
        .then(toHTMLString)

      expect(result).to.equal('scope3_form_scope3')
    })

    it('should call page with stage success as expected', async () => {
      const { args } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const result = await controller
        .scope3CarbonConsumptionStage({
          connectionId: 'connection-id',
          action: 'success',
          productId: 'SomeID',
          quantity: 111,
        })
        .then(toHTMLString)

      expect(result).to.equal('scope3_success_scope3')
    })

    it('should call page with stage error if rpc fails', async () => {
      const { args, cloudagentMock } = withQueriesMocks()
      cloudagentMock.submitDrpcRequest = sinon.stub().rejects(new Error())

      const controller = new QueriesController(...args)
      const result = await controller
        .scope3CarbonConsumptionStage({
          connectionId: 'connection-id',
          action: 'success',
          productId: 'SomeID',
          quantity: 111,
        })
        .then(toHTMLString)

      expect(result).to.equal('scope3_error_scope3')
    })

    it('should call page with stage error if rpc succeeds without response', async () => {
      const { args, cloudagentMock } = withQueriesMocks()
      cloudagentMock.submitDrpcRequest = sinon.stub().resolves(undefined)

      const controller = new QueriesController(...args)
      const result = await controller
        .scope3CarbonConsumptionStage({
          connectionId: 'connection-id',
          action: 'success',
          productId: 'SomeID',
          quantity: 111,
        })
        .then(toHTMLString)

      expect(result).to.equal('scope3_error_scope3')
    })

    it('should call page with stage error if rpc succeeds with error', async () => {
      const { args, cloudagentMock } = withQueriesMocks()
      cloudagentMock.submitDrpcRequest = sinon.stub().resolves({
        error: new Error('error'),
        id: 'request-id',
      })

      const controller = new QueriesController(...args)
      const result = await controller
        .scope3CarbonConsumptionStage({
          connectionId: 'connection-id',
          action: 'success',
          productId: 'SomeID',
          quantity: 111,
        })
        .then(toHTMLString)

      expect(result).to.equal('scope3_error_scope3')
    })
  })
  describe('query responses', () => {
    it('should call db as expected', async () => {
      const { args, dbMock } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const spy = dbMock.get
      await controller.scope3CarbonConsumptionResponse('SomeId').then(toHTMLString)
      const search = 'SomeId'
      expect(spy.firstCall.calledWith('query', { id: search })).to.equal(true)
    })

    it('should call query response page with stage FORM as expected', async () => {
      const { args } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const result = await controller.scope3CarbonConsumptionResponse('someId123').then(toHTMLString)

      expect(result).to.equal('queriesResponse_template')
    })
    it('should call query response page with stage SUCCESS as expected', async () => {
      const { args } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const result = await controller
        .scope3CarbonConsumptionResponseSubmit('5390af91-c551-4d74-b394-d8ae0805059e', {
          companyId: '2345789',
          action: 'success',
          totalScope3CarbonEmissions: '25',
        })
        .then(toHTMLString)

      expect(result).to.equal('queriesResponse_template')
    })
    it('should call page with stage error if rpc succeeds without response', async () => {
      const { args, cloudagentMock } = withQueriesMocks()
      cloudagentMock.submitDrpcRequest = sinon.stub().resolves(undefined)

      const controller = new QueriesController(...args)

      const result = await controller
        .scope3CarbonConsumptionResponseSubmit('5390af91-c551-4d74-b394-d8ae0805059e', {
          companyId: '2345789',
          action: 'success',
          totalScope3CarbonEmissions: '25',
        })
        .then(toHTMLString)

      expect(result).to.equal('scope3_error_scope3')
    })
    it('should call page with stage error if rpc fails', async () => {
      const { args, cloudagentMock } = withQueriesMocks()
      cloudagentMock.submitDrpcRequest = sinon.stub().rejects(new Error())

      const controller = new QueriesController(...args)
      const result = await controller
        .scope3CarbonConsumptionResponseSubmit('5390af91-c551-4d74-b394-d8ae0805059e', {
          companyId: '2345789',
          action: 'success',
          totalScope3CarbonEmissions: '25',
        })
        .then(toHTMLString)

      expect(result).to.equal('scope3_error_scope3')
    })
  })
  it('should call page with stage error if rpc succeeds with error', async () => {
    const { args, cloudagentMock } = withQueriesMocks()
    cloudagentMock.submitDrpcRequest = sinon.stub().resolves({
      error: new Error('error'),
      id: 'request-id',
    })

    const controller = new QueriesController(...args)
    const result = await controller
      .scope3CarbonConsumptionResponseSubmit('5390af91-c551-4d74-b394-d8ae0805059e', {
        companyId: '2345789',
        action: 'success',
        totalScope3CarbonEmissions: '25',
      })
      .then(toHTMLString)

    expect(result).to.equal('scope3_error_scope3')
  })
  describe('viewing query responses', () => {
    it('should call db as expected', async () => {
      const { args, dbMock } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const spy = dbMock.get
      await controller.scope3CarbonConsumptionViewResponse('SomeId').then(toHTMLString)
      const search = 'SomeId'
      expect(spy.firstCall.calledWith('query', { id: search })).to.equal(true)
    })
  })
  describe('Partial Query', () => {
    it('validates query and company/connection', () => {})
    it('pulls connections and returns along with partial = true', () => {})
  })
})
