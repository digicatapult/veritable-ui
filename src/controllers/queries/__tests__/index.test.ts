import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'

import { Request } from 'express'
import { mockLogger } from '../../__tests__/helpers.js'
import { QueriesController } from '../index.js'
import { mockIds, toHTMLString, withQueriesMocks } from './helpers.js'

describe('QueriesController', () => {
  const req = { log: mockLogger } as unknown as Request

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
      await controller.queryManagement(req).then(toHTMLString)
      expect(spy.firstCall.calledWith('connection', [], [['updated_at', 'desc']])).to.equal(true)
      expect(spy.secondCall.calledWith('query', {}, [['updated_at', 'desc']])).to.equal(true)
    })

    it('should call db as expected', async () => {
      const { dbMock, args } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const spy = dbMock.get
      await controller.queryManagement(req, 'VER123').then(toHTMLString)
      const search = 'VER123'
      const query = search ? [['company_name', 'ILIKE', `%${search}%`]] : {}
      expect(spy.firstCall.calledWith('connection', query, [['updated_at', 'desc']])).to.equal(true)

      expect(spy.secondCall.calledWith('query', {}, [['updated_at', 'desc']])).to.equal(true)
    })

    it('should call db as expected', async () => {
      const { dbMock, args } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const spy = dbMock.get
      await controller.scope3CarbonConsumption(req).then(toHTMLString)
      expect(spy.firstCall.calledWith('connection', [], [['updated_at', 'desc']])).to.equal(true)
    })

    it('should call db as expected', async () => {
      const { dbMock, args } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const spy = dbMock.get
      await controller.scope3CarbonConsumption(req, 'VER123').then(toHTMLString)
      const search = 'VER123'
      const query = search ? [['company_name', 'ILIKE', `%${search}%`]] : {}
      expect(spy.firstCall.calledWith('connection', query, [['updated_at', 'desc']])).to.equal(true)
    })

    it('should call page with stage FORM as expected', async () => {
      const { args } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const result = await controller
        .scope3CarbonConsumptionStage(req, { connectionId: 'connection-id', action: 'form' })
        .then(toHTMLString)

      expect(result).to.equal('scope3_form_scope3')
    })

    it('should call page with stage success as expected', async () => {
      const { args } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const result = await controller
        .scope3CarbonConsumptionStage(req, {
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
        .scope3CarbonConsumptionStage(req, {
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
        .scope3CarbonConsumptionStage(req, {
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
        .scope3CarbonConsumptionStage(req, {
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
    describe('partial query responses', () => {
      describe('if invalid partial input', () => {
        it('throws if connectionsIds array is not in the req.body', async () => {
          const { args } = withQueriesMocks()
          const controller = new QueriesController(...args)
          try {
            await controller.scope3CarbonConsumptionResponseSubmit(req, 'query-partial-id-test', {
              companyId: 'some-company-id',
              action: 'success',
              partialQuery: ['on'],
              productIds: ['product-1', 'product-2'],
              quantities: ['10', '20'],
            })
            // the below expect should never happen since we expect test to throw
            expect(false).to.be.equal(true)
          } catch (err) {
            expect(err.toString()).to.be.equal('Error: missing a property in the request body')
          }
        })

        it('throws if productIds array is not in the req.body', async () => {
          const { args } = withQueriesMocks()
          const controller = new QueriesController(...args)
          try {
            await controller.scope3CarbonConsumptionResponseSubmit(req, 'query-partial-id-test', {
              companyId: 'some-company-id',
              action: 'success',
              partialQuery: ['on'],
              connectionIds: ['conn-id-1', 'conn-id-2'],
              quantities: ['10', '20'],
            })
            // the below expect should never happen since we expect test to throw
            expect(false).to.be.equal(true)
          } catch (err) {
            expect(err.toString()).to.be.equal('Error: missing a property in the request body')
          }
        })

        it('throws if quantities and productIds arrays are not req.body', async () => {
          const { args } = withQueriesMocks()
          const controller = new QueriesController(...args)
          try {
            await controller.scope3CarbonConsumptionResponseSubmit(req, 'query-partial-id-test', {
              companyId: 'some-company-id',
              action: 'success',
              partialQuery: ['on'],
              connectionIds: ['conn-id-1', 'conn-id-2'],
            })
            // the below expect should never happen since we expect test to throw
            expect(false).to.be.equal(true)
          } catch (err) {
            expect(err.toString()).to.be.equal('Error: missing a property in the request body')
          }
        })

        it('throws if arrays are not the same size', async () => {
          const { args } = withQueriesMocks()
          const controller = new QueriesController(...args)
          try {
            await controller.scope3CarbonConsumptionResponseSubmit(req, 'query-partial-id-test', {
              companyId: 'some-company-id',
              action: 'success',
              partialQuery: ['on'],
              productIds: ['product-id-1'],
              quantities: ['1', '2', '3'],
              connectionIds: ['conn-id-1', 'conn-id-2'],
            })
            // the below expect should never happen since we expect test to throw
            expect(false).to.be.equal(true)
          } catch (err) {
            expect(err.toString()).to.be.equal('Error: partial query validation failed, invalid data')
          }
        })

        it('throws if')
      })

      it('sets a partial query status to resolved and renders response template', async () => {
        const { args, dbMock } = withQueriesMocks()
        const controller = new QueriesController(...args)
        const getSpy = dbMock.get
        const updateSpy = dbMock.update
        const result = await controller
          .scope3CarbonConsumptionResponseSubmit(req, 'query-partial-id-test', {
            companyId: 'some-company-id',
            action: 'success',
            partialQuery: ['on'],
            connectionIds: ['conn-id-1', 'conn-id-2'],
            productIds: ['product-1', 'product-2'],
            quantities: ['10', '20'],
          })
          .then(toHTMLString)

        expect(getSpy.firstCall.calledWith('connection', { id: 'some-company-id', status: 'verified_both' })).to.equal(
          true
        )
        expect(getSpy.secondCall.calledWith('query', { id: 'query-partial-id-test' })).to.equal(true)
        expect(
          updateSpy.firstCall.calledWith('query', { id: 'query-partial-id-test' }, { status: 'resolved' })
        ).to.equal(true)
        expect(result).to.be.equal('queriesResponse_template')
      })
    })

    it('should call db as expected', async () => {
      const { args, dbMock } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const spy = dbMock.get
      await controller.scope3CarbonConsumptionResponse(req, 'SomeId').then(toHTMLString)
      const search = 'SomeId'
      expect(spy.firstCall.calledWith('query', { id: search })).to.equal(true)
    })

    it('should call query response page with stage FORM as expected', async () => {
      const { args } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const result = await controller.scope3CarbonConsumptionResponse(req, 'someId123').then(toHTMLString)

      expect(result).to.equal('queriesResponse_template')
    })

    it('should call query response page with stage SUCCESS as expected', async () => {
      const { args } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const result = await controller
        .scope3CarbonConsumptionResponseSubmit(req, '5390af91-c551-4d74-b394-d8ae0805059e', {
          companyId: '2345789',
          action: 'success',
          emissions: '25',
        })
        .then(toHTMLString)

      expect(result).to.equal('queriesResponse_template')
    })

    it('should call page with stage error if rpc succeeds without response', async () => {
      const { args, cloudagentMock } = withQueriesMocks()
      cloudagentMock.submitDrpcRequest = sinon.stub().resolves(undefined)

      const controller = new QueriesController(...args)

      const result = await controller
        .scope3CarbonConsumptionResponseSubmit(req, '5390af91-c551-4d74-b394-d8ae0805059e', {
          companyId: '2345789',
          action: 'success',
          emissions: '25',
        })
        .then(toHTMLString)

      expect(result).to.equal('scope3_error_scope3')
    })

    it('should call page with stage error if rpc fails', async () => {
      const { args, cloudagentMock } = withQueriesMocks()
      cloudagentMock.submitDrpcRequest = sinon.stub().rejects(new Error())

      const controller = new QueriesController(...args)
      const result = await controller
        .scope3CarbonConsumptionResponseSubmit(req, '5390af91-c551-4d74-b394-d8ae0805059e', {
          companyId: '2345789',
          action: 'success',
          emissions: '25',
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
      .scope3CarbonConsumptionResponseSubmit(req, '5390af91-c551-4d74-b394-d8ae0805059e', {
        companyId: '2345789',
        action: 'success',
        emissions: '25',
      })
      .then(toHTMLString)

    expect(result).to.equal('scope3_error_scope3')
  })

  describe('viewing query responses', () => {
    it('should call db as expected', async () => {
      const { args, dbMock } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const spy = dbMock.get
      await controller.scope3CarbonConsumptionViewResponse(req, mockIds.queryId).then(toHTMLString)
      expect(spy.firstCall.calledWith('query', { id: mockIds.queryId })).to.equal(true)
    })
  })

  describe('Partial Query', () => {
    const { args, dbMock } = withQueriesMocks()
    let result: string

    before(async () => {
      sinon.restore()

      const controller = new QueriesController(...args)
      result = await controller
        .scope3CO2Partial(
          req,
          mockIds.queryId, // url param
          'on' // partialSelect query string param
        )
        .then(toHTMLString)
    })

    afterEach(() => sinon.restore())

    describe('if query string param [partialQuery] not provided', () => {
      it('renders a regular form template', async () => {
        const controller = new QueriesController(...args)
        result = await controller
          .scope3CO2Partial(
            req,
            mockIds.queryId // url param
          )
          .then(toHTMLString)

        expect(result).to.be.equal('queriesResponse_template')
      })
    })

    it('returns the correct HTML template', () => {
      expect(result).to.contain('queriesResponse_template')
    })

    it('retrieves connections and query details from a database', async () => {
      expect(dbMock.get.args).to.deep.equal([
        ['query', { id: '00000000-0000-0000-0000-d8ae0805059e' }],
        ['connection', { id: 'cccccccc-0001-0000-0000-d8ae0805059e' }],
        ['connection', { status: 'verified_both' }],
      ])
    })

    it('pulls connections and returns along with partial = true', async () => {
      const formatted = JSON.parse(result.replace('queriesResponse_template-', ''))

      expect(result).to.contain('queriesResponse_template-')
      expect(formatted.partial).to.be.equal(true)
      expect(formatted.connections).to.deep.equal([
        {
          agent_connection_id: 'aaaaaaaa-0000-0000-0000-d8ae0805059e',
          company_name: 'PARTIAL_QUERY',
          id: 'cccccccc-0000-0000-0000-d8ae0805059e',
          status: 'verified_both',
        },
        {
          agent_connection_id: 'aaaaaaaa-0000-0000-0000-d8ae0805059e',
          company_name: 'VERIFIED_THEM',
          id: 'cccccccc-0000-0000-0000-d8ae0805059e',
          status: 'verified_them',
        },
      ])
    })
  })
})
