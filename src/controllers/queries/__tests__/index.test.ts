import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'

import { Request } from 'express'
import { InvalidInputError } from '../../../errors.js'
import { mockLogger } from '../../__tests__/helpers.js'
import { QueriesController } from '../index.js'
import { mockIds, toHTMLString, withQueriesMocks } from './helpers.js'

const expiresAtExpectation = new Date(1000 + 7 * 24 * 60 * 60 * 1000)

describe('QueriesController', () => {
  const req = { log: mockLogger } as unknown as Request
  let clock: sinon.SinonFakeTimers | null = null

  beforeEach(() => {
    clock = sinon.useFakeTimers({ now: 1000, toFake: ['Date'] })
  })

  afterEach(() => {
    clock?.restore()
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
      await controller.carbonEmbodiment(req).then(toHTMLString)
      expect(spy.firstCall.calledWith('connection', [], [['updated_at', 'desc']])).to.equal(true)
    })

    it('should call db as expected', async () => {
      const { dbMock, args } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const spy = dbMock.get
      await controller.carbonEmbodiment(req, 'VER123').then(toHTMLString)
      const search = 'VER123'
      const query = search ? [['company_name', 'ILIKE', `%${search}%`]] : {}
      expect(spy.firstCall.calledWith('connection', query, [['updated_at', 'desc']])).to.equal(true)
    })

    it('should call page with stage carbonEmbodiment as expected', async () => {
      const { args } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const result = await controller.carbonEmbodiment(req, undefined, 'connection-id').then(toHTMLString)

      expect(result).to.equal('queryForm_carbonEmbodiment_queryForm')
    })

    it('should call page with stage success as expected', async () => {
      const { dbMock, args } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const result = await controller
        .carbonEmbodimentSubmit(req, {
          connectionId: 'connection-id',
          productId: 'SomeID',
          quantity: 111,
        })
        .then(toHTMLString)

      expect(dbMock.insert.getCall(0).args).to.deep.equal([
        'query',
        {
          connection_id: 'cccccccc-0001-0000-0000-d8ae0805059e',
          details: {
            subjectId: {
              idType: 'product_and_quantity',
              content: {
                productId: 'SomeID',
                quantity: 111,
              },
            },
          },
          parent_id: null,
          response: null,
          type: 'total_carbon_embodiment',
          response_id: null,
          role: 'requester',
          status: 'pending_their_input',
          expires_at: expiresAtExpectation,
        },
      ])
      expect(result).to.equal('queryForm_success_queryForm')
    })

    it('should call page with stage error if rpc fails', async () => {
      const { args, cloudagentMock } = withQueriesMocks()
      cloudagentMock.submitDrpcRequest = sinon.stub().rejects(new Error())

      const controller = new QueriesController(...args)
      const result = await controller
        .carbonEmbodimentSubmit(req, {
          connectionId: 'connection-id',
          productId: 'SomeID',
          quantity: 111,
        })
        .then(toHTMLString)

      expect(result).to.equal('queryForm_error_queryForm')
    })

    it('should call page with stage error if rpc succeeds without response', async () => {
      const { dbMock, args, cloudagentMock } = withQueriesMocks()
      cloudagentMock.submitDrpcRequest = sinon.stub().resolves(null)

      const controller = new QueriesController(...args)
      const result = await controller
        .carbonEmbodimentSubmit(req, {
          connectionId: 'connection-id',
          productId: 'SomeID',
          quantity: 111,
        })
        .then(toHTMLString)
      expect(dbMock.update.getCall(0).args).to.deep.equal([
        'query',
        { id: 'ccaaaaaa-0000-0000-0000-d8ae0805059e' },
        { status: 'errored' },
      ])
      expect(result).to.equal('queryForm_error_queryForm')
    })

    it('should call page with stage error if rpc returns with error', async () => {
      const { dbMock, args, cloudagentMock } = withQueriesMocks()
      cloudagentMock.submitDrpcRequest = sinon.stub().resolves({
        error: new Error('error'),
        id: 'request-id',
      })

      const controller = new QueriesController(...args)
      const result = await controller
        .carbonEmbodimentSubmit(req, {
          connectionId: 'connection-id',
          productId: 'SomeID',
          quantity: 111,
        })
        .then(toHTMLString)
      expect(dbMock.update.getCall(0).args).to.deep.equal([
        'query',
        { id: 'ccaaaaaa-0000-0000-0000-d8ae0805059e' },
        { status: 'errored' },
      ])

      expect(result).to.equal('queryForm_error_queryForm')
    })
  })

  describe('query responses', () => {
    describe('partial query responses', () => {
      describe('if invalid partial input', () => {
        it('throws if connectionsIds array is not in the req.body', async () => {
          const { args } = withQueriesMocks()
          const controller = new QueriesController(...args)
          try {
            await controller.carbonEmbodimentResponseSubmit(req, 'query-partial-id-test', {
              companyId: 'some-company-id',
              action: 'success',
              partialQuery: ['on'],
              productIds: ['product-1', 'product-2'],
              quantities: [10, 20],
              emissions: 10,
            })
            // the below expect should never happen since we expect test to throw
            expect.fail('Expected exception to be thrown')
          } catch (err) {
            if (!(err instanceof InvalidInputError)) {
              expect.fail('expected InvalidInputError')
            }
            expect(err.toString()).to.be.equal('Error: missing a property in the request body')
          }
        })

        it('throws if productIds array is not in the req.body', async () => {
          const { args } = withQueriesMocks()
          const controller = new QueriesController(...args)
          try {
            await controller.carbonEmbodimentResponseSubmit(req, 'query-partial-id-test', {
              companyId: 'some-company-id',
              action: 'success',
              partialQuery: ['on'],
              connectionIds: ['conn-id-1', 'conn-id-2'],
              quantities: [10, 20],
              emissions: 10,
            })
            expect.fail('Expected exception to be thrown')
          } catch (err) {
            if (!(err instanceof InvalidInputError)) {
              expect.fail('expected InvalidInputError')
            }
            expect(err.toString()).to.be.equal('Error: missing a property in the request body')
          }
        })

        it('throws if quantities and productIds arrays are not req.body', async () => {
          const { args } = withQueriesMocks()
          const controller = new QueriesController(...args)
          try {
            await controller.carbonEmbodimentResponseSubmit(req, 'query-partial-id-test', {
              companyId: 'some-company-id',
              action: 'success',
              partialQuery: ['on'],
              connectionIds: ['conn-id-1', 'conn-id-2'],
              emissions: 10,
            })
            expect.fail('Expected exception to be thrown')
          } catch (err) {
            if (!(err instanceof InvalidInputError)) {
              expect.fail('expected InvalidInputError')
            }
            expect(err.toString()).to.be.equal('Error: missing a property in the request body')
          }
        })

        it('throws if arrays are not the same size', async () => {
          const { args } = withQueriesMocks()
          const controller = new QueriesController(...args)
          try {
            await controller.carbonEmbodimentResponseSubmit(req, 'query-partial-id-test', {
              companyId: 'some-company-id',
              action: 'success',
              partialQuery: ['on'],
              productIds: ['product-id-1'],
              quantities: [1, 2, 3],
              connectionIds: ['conn-id-1', 'conn-id-2'],
              emissions: 10,
            })
            expect.fail('Expected exception to be thrown')
          } catch (err) {
            if (!(err instanceof InvalidInputError)) {
              expect.fail('expected InvalidInputError')
            }
            expect(err.toString()).to.be.equal('Error: partial query validation failed, invalid data')
          }
        })
      })

      it('creates a child query and renders a response view', async () => {
        const { args, dbMock } = withQueriesMocks()
        const controller = new QueriesController(...args)
        const result = await controller
          .carbonEmbodimentResponseSubmit(req, 'query-partial-id-test', {
            companyId: 'some-company-id',
            action: 'success',
            partialQuery: ['on'],
            emissions: 10,
            partialSelect: ['on', 'on'],
            connectionIds: ['conn-id-1', 'conn-id-2'],
            productIds: ['product-1', 'product-2'],
            quantities: [10, 20],
          })
          .then(toHTMLString)

        expect(dbMock.insert.getCall(0).args).to.deep.equal([
          'query',
          {
            connection_id: 'conn-id-1',
            type: 'total_carbon_embodiment',
            status: 'pending_their_input',
            parent_id: '5390af91-c551-4d74-b394-d8ae0805059a',
            details: {
              subjectId: {
                idType: 'product_and_quantity',
                content: {
                  productId: 'product-1',
                  quantity: 10,
                },
              },
            },
            response_id: null,
            response: null,
            role: 'requester',
            expires_at: new Date(),
          },
        ])
        expect(dbMock.insert.getCall(1).args).to.deep.equal([
          'query',
          {
            connection_id: 'conn-id-2',
            parent_id: '5390af91-c551-4d74-b394-d8ae0805059a',
            type: 'total_carbon_embodiment',
            status: 'pending_their_input',
            details: {
              subjectId: {
                idType: 'product_and_quantity',
                content: {
                  productId: 'product-2',
                  quantity: 20,
                },
              },
            },
            response_id: null,
            response: null,
            role: 'requester',
            expires_at: new Date(),
          },
        ])
        expect(
          dbMock.get.firstCall.calledWith('connection', { id: 'some-company-id', status: 'verified_both' })
        ).to.equal(true)
        expect(dbMock.get.secondCall.calledWith('query', { id: 'query-partial-id-test' })).to.equal(true)
        expect(result).to.be.equal('queriesResponse_success_template')
      })
    })

    it('should call db as expected', async () => {
      const { args, dbMock } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const spy = dbMock.get
      await controller.carbonEmbodimentResponse(req, 'SomeId').then(toHTMLString)
      const search = 'SomeId'
      expect(spy.firstCall.calledWith('query', { id: search })).to.equal(true)
    })

    it('should call query response page with stage FORM as expected', async () => {
      const { args } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const result = await controller.carbonEmbodimentResponse(req, 'someId123').then(toHTMLString)

      expect(result).to.equal('queriesResponse_form_template')
    })

    it('should call query response page with stage SUCCESS as expected', async () => {
      const { args } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const result = await controller
        .carbonEmbodimentResponseSubmit(req, '5390af91-c551-4d74-b394-d8ae0805059e', {
          companyId: '2345789',
          action: 'success',
          emissions: 25,
        })
        .then(toHTMLString)

      expect(result).to.equal('queryForm_success_queryForm')
    })

    it('sets query status to error if rpc succeeds without response', async () => {
      const { dbMock, args, cloudagentMock } = withQueriesMocks()
      cloudagentMock.submitDrpcRequest = sinon.stub().resolves(undefined)

      const controller = new QueriesController(...args)

      const result = await controller
        .carbonEmbodimentResponseSubmit(req, '5390af91-c551-4d74-b394-d8ae0805059e', {
          companyId: '2345789',
          action: 'success',
          emissions: 25,
        })
        .then(toHTMLString)

      expect(result).to.equal('queryForm_error_queryForm')
      expect(dbMock.update.getCall(0).args).to.deep.equal([
        'query',
        { id: '5390af91-c551-4d74-b394-d8ae0805059a' },
        { status: 'errored' },
      ])
    })

    it('should call page with stage error if rpc fails', async () => {
      const { args, cloudagentMock } = withQueriesMocks()
      cloudagentMock.submitDrpcRequest = sinon.stub().rejects(new Error('testing'))

      const controller = new QueriesController(...args)
      const result = await controller
        .carbonEmbodimentResponseSubmit(req, '5390af91-c551-4d74-b394-d8ae0805059e', {
          companyId: '2345789',
          action: 'success',
          emissions: 25,
        })
        .then(toHTMLString)

      expect(result).to.equal('queryForm_error_queryForm')
    })
  })

  it('should call page with stage error if rpc succeeds with error', async () => {
    const { dbMock, args, cloudagentMock } = withQueriesMocks()
    cloudagentMock.submitDrpcRequest = sinon.stub().resolves({
      error: new Error('error'),
      id: 'request-id',
    })

    const controller = new QueriesController(...args)
    const result = await controller
      .carbonEmbodimentResponseSubmit(req, '5390af91-c551-4d74-b394-d8ae0805059e', {
        companyId: '2345789',
        action: 'success',
        emissions: 25,
      })
      .then(toHTMLString)
    expect(dbMock.update.getCall(0).args).to.deep.equal([
      'query',
      { id: '5390af91-c551-4d74-b394-d8ae0805059a' },
      { status: 'errored' },
    ])
    expect(result).to.equal('queryForm_error_queryForm')
  })

  describe('viewing query responses', () => {
    it('should call db as expected', async () => {
      const { args, dbMock } = withQueriesMocks()
      const controller = new QueriesController(...args)
      const spy = dbMock.get
      await controller.carbonEmbodimentViewResponse(req, mockIds.queryId).then(toHTMLString)
      expect(spy.firstCall.calledWith('query', { id: mockIds.queryId })).to.equal(true)
    })
  })

  describe('Partial Query', () => {
    const { args, dbMock, cloudagentMock } = withQueriesMocks()
    let result: string

    before(async () => {
      sinon.restore()

      const controller = new QueriesController(...args)
      result = await controller
        .cO2Partial(
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
          .cO2Partial(
            req,
            mockIds.queryId // url param
          )
          .then(toHTMLString)

        expect(result).to.be.equal('queriesResponse_form_template')
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

    describe('partial query submit', () => {
      before(async () => {
        const controller = new QueriesController(...args)
        result = await controller
          .carbonEmbodimentResponseSubmit(req, mockIds.queryId, {
            companyId: 'cccccccc-0001-0000-0000-d8ae0805059e',
            action: 'success',
            partialQuery: ['on'],
            partialSelect: ['on'],
            productIds: ['partial-product-id'],
            quantities: [10],
            connectionIds: ['cccccccc-0000-0000-0000-d8ae0805059e'],
            emissions: 10,
          })
          .then(toHTMLString)
      })

      it('submits a Drpc request to the cloudagent', () => {
        expect(cloudagentMock.submitDrpcRequest.callCount).to.equal(1)
        expect(cloudagentMock.submitDrpcRequest.firstCall.args).to.have.deep.members([
          'aaaaaaaa-0000-0000-0000-d8ae0805059e',
          'submit_query_request',
          {
            data: {
              subjectId: {
                idType: 'product_and_quantity',
                content: {
                  productId: 'partial-product-id',
                  quantity: 10,
                },
              },
            },
            id: 'ccaaaaaa-0000-0000-0000-d8ae0805059e',
            type: 'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_types/total_carbon_embodiment/request',
            createdTime: 1,
            expiresTime: 1,
          },
        ])
      })

      it('inserts new query that is to be forwarded as partial', () => {
        expect(dbMock.insert.getCall(0).args).to.have.deep.members([
          'query',
          {
            connection_id: 'cccccccc-0000-0000-0000-d8ae0805059e',
            type: 'total_carbon_embodiment',
            status: 'pending_their_input',
            parent_id: '5390af91-c551-4d74-b394-d8ae0805059a',
            details: {
              subjectId: {
                idType: 'product_and_quantity',
                content: {
                  quantity: 10,
                  productId: 'partial-product-id',
                },
              },
            },
            response_id: null,
            response: null,
            role: 'requester',
            expires_at: new Date(),
          },
        ])
      })

      it('updates existing query status to forwarded', () => {
        expect(dbMock.update.firstCall.args).to.deep.equal([
          'query',
          {
            id: mockIds.queryId,
          },
          {
            status: 'forwarded',
            response: {
              mass: 10,
              unit: 'kg',
              partialResponses: [],
              subjectId: {
                idType: 'product_and_quantity',
                content: {
                  productId: '00000000-0000-0000-0000-d8ae0805059e',
                  quantity: 2,
                },
              },
            },
          },
        ])
      })

      it('inserts a drpc response to query_rpc table', () => {
        expect(dbMock.insert.getCall(1).args).to.deep.equal([
          'query_rpc',
          {
            agent_rpc_id: 'request-id',
            query_id: 'ccaaaaaa-0000-0000-0000-d8ae0805059e',
            role: 'client',
            method: 'submit_query_request',
            result: {
              type: 'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_ack/0.1',
            },
          },
        ])
      })

      it('renders success page', () => {
        expect(result).to.equal('queriesResponse_success_template')
      })
    })
  })
})
