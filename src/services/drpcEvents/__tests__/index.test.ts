import { expect } from 'chai'
import { beforeEach, describe, it } from 'mocha'
import sinon from 'sinon'

import { DrpcRequest } from '../../veritableCloudagentEvents.js'
import DrpcEvents from '../index.js'
import { withDrpcEventMocks } from './helpers.js'

const goodRequest: DrpcRequest = {
  id: 'request-id',
  jsonrpc: '2.0',
  method: 'submit_query_request',
  params: {
    id: 'fb45f64a-7c2b-43e8-85c2-da66a6899446',
    data: {
      subjectId: {
        idType: 'product_and_quantity',
        content: { productId: 'product-id', quantity: 42 },
      },
    },
    type: 'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_types/total_carbon_embodiment/request/0.1',
    createdTime: 0,
    expiresTime: 1,
  },
}

const goodResponse: DrpcRequest = {
  id: 'request-id',
  jsonrpc: '2.0',
  method: 'submit_query_response',
  params: {
    id: 'query-id',
    type: 'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_types/total_carbon_embodiment/response/0.1',
    data: {
      mass: 3456,
      unit: 'kg',
      subjectId: {
        idType: 'product_and_quantity',
        content: { productId: 'product-id', quantity: 42 },
      },
      partialResponses: [],
    },
  },
}

const goodResponseChild = {
  id: 'request-id-2',
  jsonrpc: '2.0',
  method: 'submit_query_response',
  params: {
    id: 'child-query-id',
    type: 'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_types/total_carbon_embodiment/response/0.1',
    data: {
      mass: 200,
      unit: 'kg',
      subjectId: {
        idType: 'product_and_quantity',
        content: { productId: 'partial-product-id', quantity: 42 },
      },
      partialResponses: [],
    },
  },
}

describe('DrpcEvents', function () {
  let clock: sinon.SinonFakeTimers
  before(function () {
    clock = sinon.useFakeTimers()
  })
  after(function () {
    clock.restore()
  })

  describe('DrpcRequestStateChanged-requestReceived', function () {
    describe('happy path', function () {
      let mocks: ReturnType<typeof withDrpcEventMocks>
      beforeEach(async function () {
        clock.reset()
        mocks = withDrpcEventMocks()
        const drpcEvents = new DrpcEvents(...mocks.args)
        drpcEvents.start()
        mocks.eventsMock.emit('DrpcRequestStateChanged', {
          type: 'DrpcRequestStateChanged',
          payload: {
            drpcMessageRecord: {
              request: goodRequest,
              connectionId: 'agent-connection-id',
              role: 'server',
              state: 'request-received',
            },
          },
        })

        await clock.runAllAsync()
      })

      it('should get the relevant connection correctly', function () {
        const stub = mocks.dbMock.get
        expect(stub.callCount).to.equal(1)
        expect(stub.firstCall.args).to.deep.equal(['connection', { agent_connection_id: 'agent-connection-id' }])
      })

      it('should call submitDrpcResponse correctly', function () {
        const stub = mocks.cloudagentMock.submitDrpcResponse
        expect(stub.callCount).to.equal(1)
        expect(stub.firstCall.args).to.deep.equal([
          'request-id',
          {
            result: {
              type: 'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_ack/0.1',
            },
          },
        ])
      })

      it('should insert into the database a query and query_rpc', function () {
        const stub = mocks.dbMock.insert
        expect(stub.callCount).to.equal(2)
        expect(stub.firstCall.args).to.deep.equal([
          'query',
          {
            connection_id: 'connection-id',
            status: 'pending_your_input',
            type: 'total_carbon_embodiment',
            details: {
              subjectId: {
                idType: 'product_and_quantity',
                content: { productId: 'product-id', quantity: 42 },
              },
            },
            response_id: 'fb45f64a-7c2b-43e8-85c2-da66a6899446',
            role: 'responder',
            response: null,
            expires_at: new Date(1000),
          },
        ])
        expect(stub.secondCall.args).to.deep.equal([
          'query_rpc',
          {
            query_id: 'query-id',
            method: 'submit_query_request',
            role: 'server',
            agent_rpc_id: 'request-id',
            result: {
              type: 'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_ack/0.1',
            },
          },
        ])
      })

      it('should not update the database', function () {
        const stub = mocks.dbMock.update
        expect(stub.callCount).to.equal(0)
      })
    })

    describe('missing request', function () {
      let mocks: ReturnType<typeof withDrpcEventMocks>
      beforeEach(async function () {
        clock.reset()
        mocks = withDrpcEventMocks()
        const drpcEvents = new DrpcEvents(...mocks.args)
        drpcEvents.start()
        mocks.eventsMock.emit('DrpcRequestStateChanged', {
          type: 'DrpcRequestStateChanged',
          payload: {
            drpcMessageRecord: {
              connectionId: 'agent-connection-id',
              role: 'server',
              state: 'request-received',
            },
          },
        })

        await clock.runAllAsync()
      })

      it('should not call any db or cloudagent methods', function () {
        const stubs = [
          mocks.cloudagentMock.submitDrpcResponse,
          mocks.dbMock.get,
          mocks.dbMock.update,
          mocks.dbMock.insert,
        ]
        for (const stub of stubs) {
          expect(stub.callCount).to.equal(0)
        }
      })
    })

    describe('as client', function () {
      let mocks: ReturnType<typeof withDrpcEventMocks>
      beforeEach(async function () {
        clock.reset()
        mocks = withDrpcEventMocks()
        const drpcEvents = new DrpcEvents(...mocks.args)
        drpcEvents.start()
        mocks.eventsMock.emit('DrpcRequestStateChanged', {
          type: 'DrpcRequestStateChanged',
          payload: {
            drpcMessageRecord: {
              request: goodRequest,
              connectionId: 'agent-connection-id',
              role: 'client',
              state: 'request-received',
            },
          },
        })

        await clock.runAllAsync()
      })

      it('should not call any db or cloudagent methods', function () {
        const stubs = [
          mocks.cloudagentMock.submitDrpcResponse,
          mocks.dbMock.get,
          mocks.dbMock.update,
          mocks.dbMock.insert,
        ]
        for (const stub of stubs) {
          expect(stub.callCount).to.equal(0)
        }
      })
    })

    describe('request-sent state', function () {
      let mocks: ReturnType<typeof withDrpcEventMocks>
      beforeEach(async function () {
        clock.reset()
        mocks = withDrpcEventMocks()
        const drpcEvents = new DrpcEvents(...mocks.args)
        drpcEvents.start()
        mocks.eventsMock.emit('DrpcRequestStateChanged', {
          type: 'DrpcRequestStateChanged',
          payload: {
            drpcMessageRecord: {
              request: goodRequest,
              connectionId: 'agent-connection-id',
              role: 'server',
              state: 'request-sent',
            },
          },
        })

        await clock.runAllAsync()
      })

      it('should not call any db or cloudagent methods', function () {
        const stubs = [
          mocks.cloudagentMock.submitDrpcResponse,
          mocks.dbMock.get,
          mocks.dbMock.update,
          mocks.dbMock.insert,
        ]
        for (const stub of stubs) {
          expect(stub.callCount).to.equal(0)
        }
      })
    })

    describe('invalid method', function () {
      let mocks: ReturnType<typeof withDrpcEventMocks>
      beforeEach(async function () {
        clock.reset()
        mocks = withDrpcEventMocks()
        const drpcEvents = new DrpcEvents(...mocks.args)
        drpcEvents.start()
        mocks.eventsMock.emit('DrpcRequestStateChanged', {
          type: 'DrpcRequestStateChanged',
          payload: {
            drpcMessageRecord: {
              request: {
                ...goodRequest,
                method: 'invalid_method',
              },
              connectionId: 'agent-connection-id',
              role: 'server',
              state: 'request-received',
            },
          },
        })

        await clock.runAllAsync()
      })

      it('should submit an error response', function () {
        const stub = mocks.cloudagentMock.submitDrpcResponse
        expect(stub.callCount).to.equal(1)
        expect(stub.firstCall.args).to.deep.equal([
          'request-id',
          {
            error: {
              code: -32601,
              message: `Method not supported invalid_method`,
            },
          },
        ])
      })

      it('should not call any db', function () {
        const stubs = [mocks.dbMock.get, mocks.dbMock.update, mocks.dbMock.insert]
        for (const stub of stubs) {
          expect(stub.callCount).to.equal(0)
        }
      })
    })

    describe('bad params', function () {
      let mocks: ReturnType<typeof withDrpcEventMocks>
      beforeEach(async function () {
        clock.reset()
        mocks = withDrpcEventMocks()
        const drpcEvents = new DrpcEvents(...mocks.args)
        drpcEvents.start()
        mocks.eventsMock.emit('DrpcRequestStateChanged', {
          type: 'DrpcRequestStateChanged',
          payload: {
            drpcMessageRecord: {
              request: {
                ...goodRequest,
                params: {},
              },
              connectionId: 'agent-connection-id',
              role: 'server',
              state: 'request-received',
            },
          },
        })

        await clock.runAllAsync()
      })

      it('should submit an error response', function () {
        const stub = mocks.cloudagentMock.submitDrpcResponse
        expect(stub.callCount).to.equal(1)
        expect(stub.firstCall.args).to.deep.equal([
          'request-id',
          {
            error: {
              code: -32602,
              message: 'invalid params object',
            },
          },
        ])
      })

      it('should not call any db', function () {
        const stubs = [mocks.dbMock.get, mocks.dbMock.update, mocks.dbMock.insert]
        for (const stub of stubs) {
          expect(stub.callCount).to.equal(0)
        }
      })
    })

    describe('invalid query', function () {
      let mocks: ReturnType<typeof withDrpcEventMocks>
      beforeEach(async function () {
        clock.reset()
        mocks = withDrpcEventMocks()
        const drpcEvents = new DrpcEvents(...mocks.args)
        drpcEvents.start()
        mocks.eventsMock.emit('DrpcRequestStateChanged', {
          type: 'DrpcRequestStateChanged',
          payload: {
            drpcMessageRecord: {
              request: {
                ...goodRequest,
                params: {
                  ...goodRequest.params,
                  type: 'invalid_query',
                },
              },
              connectionId: 'agent-connection-id',
              role: 'server',
              state: 'request-received',
            },
          },
        })

        await clock.runAllAsync()
      })

      it('should submit an error response', function () {
        const stub = mocks.cloudagentMock.submitDrpcResponse
        expect(stub.callCount).to.equal(1)
        expect(stub.firstCall.args).to.deep.equal([
          'request-id',
          {
            error: {
              code: -32602,
              message: 'invalid params object',
            },
          },
        ])
      })

      it('should not call any db', function () {
        const stubs = [mocks.dbMock.get, mocks.dbMock.update, mocks.dbMock.insert]
        for (const stub of stubs) {
          expect(stub.callCount).to.equal(0)
        }
      })
    })

    describe('unknown agent connection', function () {
      let mocks: ReturnType<typeof withDrpcEventMocks>
      beforeEach(async function () {
        clock.reset()
        mocks = withDrpcEventMocks()
        mocks.dbMock.get = sinon.stub().resolves([])
        const drpcEvents = new DrpcEvents(...mocks.args)
        drpcEvents.start()
        mocks.eventsMock.emit('DrpcRequestStateChanged', {
          type: 'DrpcRequestStateChanged',
          payload: {
            drpcMessageRecord: {
              request: goodRequest,
              connectionId: 'invalid-agent-connection-id',
              role: 'server',
              state: 'request-received',
            },
          },
        })

        await clock.runAllAsync()
      })

      it('should get the relevant connection correctly', function () {
        const stub = mocks.dbMock.get
        expect(stub.callCount).to.equal(1)
        expect(stub.firstCall.args).to.deep.equal([
          'connection',
          { agent_connection_id: 'invalid-agent-connection-id' },
        ])
      })

      it('should not call any other db methods or submitDrpcResponse', function () {
        const stubs = [mocks.cloudagentMock.submitDrpcResponse, mocks.dbMock.update, mocks.dbMock.insert]
        for (const stub of stubs) {
          expect(stub.callCount).to.equal(0)
        }
      })
    })

    describe('method throwing before query insert', function () {
      let mocks: ReturnType<typeof withDrpcEventMocks>
      beforeEach(async function () {
        clock.reset()
        mocks = withDrpcEventMocks()
        mocks.dbMock.get = sinon.stub().rejects(new Error())
        const drpcEvents = new DrpcEvents(...mocks.args)
        drpcEvents.start()
        mocks.eventsMock.emit('DrpcRequestStateChanged', {
          type: 'DrpcRequestStateChanged',
          payload: {
            drpcMessageRecord: {
              request: goodRequest,
              connectionId: 'agent-connection-id',
              role: 'server',
              state: 'request-received',
            },
          },
        })

        await clock.runAllAsync()
      })

      it('should get the relevant connection correctly', function () {
        const stub = mocks.dbMock.get
        expect(stub.callCount).to.equal(1)
        expect(stub.firstCall.args).to.deep.equal(['connection', { agent_connection_id: 'agent-connection-id' }])
      })

      it('should submit an error response', function () {
        const stub = mocks.cloudagentMock.submitDrpcResponse
        expect(stub.callCount).to.equal(1)
        expect(stub.firstCall.args).to.deep.equal([
          'request-id',
          {
            error: {
              code: -32603,
              message: 'Internal error',
            },
          },
        ])
      })

      it('should not call any other db methods', function () {
        const stubs = [mocks.dbMock.update, mocks.dbMock.insert]
        for (const stub of stubs) {
          expect(stub.callCount).to.equal(0)
        }
      })
    })

    describe('method throwing after query insert', function () {
      let mocks: ReturnType<typeof withDrpcEventMocks>
      beforeEach(async function () {
        clock.reset()
        mocks = withDrpcEventMocks()
        mocks.cloudagentMock.submitDrpcResponse = sinon.stub().rejects(new Error())
        const drpcEvents = new DrpcEvents(...mocks.args)
        drpcEvents.start()
        mocks.eventsMock.emit('DrpcRequestStateChanged', {
          type: 'DrpcRequestStateChanged',
          payload: {
            drpcMessageRecord: {
              request: goodRequest,
              connectionId: 'agent-connection-id',
              role: 'server',
              state: 'request-received',
            },
          },
        })

        await clock.runAllAsync()
      })

      it('should get the relevant connection correctly', function () {
        const stub = mocks.dbMock.get
        expect(stub.callCount).to.equal(1)
        expect(stub.firstCall.args).to.deep.equal(['connection', { agent_connection_id: 'agent-connection-id' }])
      })

      it('should insert into the database a query and query_rpc', function () {
        const stub = mocks.dbMock.insert
        expect(stub.callCount).to.equal(1)
        expect(stub.firstCall.args).to.deep.equal([
          'query',
          {
            connection_id: 'connection-id',
            status: 'pending_your_input',
            type: 'total_carbon_embodiment',
            details: {
              subjectId: {
                idType: 'product_and_quantity',
                content: { productId: 'product-id', quantity: 42 },
              },
            },
            response_id: 'fb45f64a-7c2b-43e8-85c2-da66a6899446',
            response: null,
            role: 'responder',
            expires_at: new Date(1000),
          },
        ])
      })

      it('should update the database marking the query as errored', function () {
        const stub = mocks.dbMock.update
        expect(stub.callCount).to.equal(1)
        expect(stub.firstCall.args).to.deep.equal([
          'query',
          { id: 'query-id' },
          {
            status: 'errored',
          },
        ])
      })

      it('should submit an error response', function () {
        const stub = mocks.cloudagentMock.submitDrpcResponse
        expect(stub.callCount).to.equal(2)
        expect(stub.secondCall.args).to.deep.equal([
          'request-id',
          {
            error: {
              code: -32603,
              message: 'Internal error',
            },
          },
        ])
      })
    })
  })
  describe('DrpcRequestStateChanged-responseReceived', function () {
    describe('partial query', function () {
      const childQuery = [{ id: 'child-query-id', response: null, parent_id: 'query-id' }]
      const parentQuery = [
        {
          id: 'query-id',
          details: {
            subjectId: {
              idType: 'product_and_quantity',
              content: {
                productId: 'parent-product-id',
                quantity: 42,
              },
            },
          },
          response: {
            mass: 58,
            unit: 'kg',
          },
          status: 'forwarded',
          connection_id: 'parent-connection-id',
        },
      ]
      const allChildQuery = [
        {
          id: 'child-query-id',
          response: {
            subjectId: {
              idType: 'product_and_quantity',
              content: {
                productId: 'child-product-id',
                quantity: 42,
              },
            },
            mass: 42,
            unit: 'kg',
          },
          parent_id: 'query-id',
          status: 'resolved',
        },
      ]
      const childConnection = [{ id: 'child-connection-id' }]

      const { eventsMock, dbMock, args } = withDrpcEventMocks()
      const drpcEvents = new DrpcEvents(...args)

      before(async function () {
        clock.reset()
        dbMock.get.onFirstCall().resolves(childConnection)
        dbMock.get.onCall(1).resolves(childQuery)
        dbMock.get.onCall(2).resolves(parentQuery)
        dbMock.get.onCall(4).resolves(allChildQuery)

        drpcEvents.start()

        eventsMock.emit('DrpcRequestStateChanged', {
          type: 'DrpcRequestStateChanged',
          payload: {
            drpcMessageRecord: {
              request: goodResponseChild,
              connectionId: 'child-connection-id',
              role: 'server',
              state: 'request-received',
            },
          },
        })

        await clock.runAllAsync()
      })

      it('retrieves a regular query along with partial', () => {
        const stub = dbMock.get
        expect(stub.callCount).to.equal(5)
        expect(stub.getCall(0).args).to.deep.equal(['connection', { agent_connection_id: 'child-connection-id' }])
        expect(stub.getCall(1).args).to.deep.equal(['query', { id: 'child-query-id', role: 'requester' }])
        expect(stub.getCall(2).args).to.deep.equal(['query', { id: 'query-id', role: 'responder' }])
        expect(stub.getCall(3).args).to.deep.equal(['connection', { id: 'parent-connection-id' }])
        expect(stub.getCall(4).args).to.deep.equal(['query', { parent_id: 'query-id', role: 'requester' }])
      })

      it('updates response as per drpc request', () => {
        const stub = dbMock.update

        expect(stub.callCount).to.equal(2)
        expect(stub.firstCall.args).to.deep.equal([
          'query',
          { id: 'child-query-id' },
          {
            response: {
              mass: 200,
              unit: 'kg',
              partialResponses: [],
              subjectId: {
                idType: 'product_and_quantity',
                content: { productId: 'partial-product-id', quantity: 42 },
              },
            },
            status: 'resolved',
          },
        ])
        expect(stub.lastCall.args).to.deep.equal([
          'query',
          { id: 'query-id' },
          {
            response: {
              mass: 58,
              unit: 'kg',
              partialResponses: [
                {
                  data: {
                    mass: 42,
                    unit: 'kg',
                    subjectId: {
                      idType: 'product_and_quantity',
                      content: { productId: 'child-product-id', quantity: 42 },
                    },
                  },
                  id: 'child-query-id',
                  type: 'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_types/undefined/response/0.1',
                },
              ],
              subjectId: {
                idType: 'product_and_quantity',
                content: { productId: 'parent-product-id', quantity: 42 },
              },
            },
            status: 'resolved',
          },
        ])
      })
    })

    describe('happy path', function () {
      let mocks: ReturnType<typeof withDrpcEventMocks>
      beforeEach(async function () {
        clock.reset()
        mocks = withDrpcEventMocks()
        const drpcEvents = new DrpcEvents(...mocks.args)
        drpcEvents.start()
        mocks.eventsMock.emit('DrpcRequestStateChanged', {
          type: 'DrpcRequestStateChanged',
          payload: {
            drpcMessageRecord: {
              request: goodResponse,
              connectionId: 'agent-connection-id',
              role: 'server',
              state: 'request-received',
            },
          },
        })

        await clock.runAllAsync()
      })
      it('should get the relevant connection correctly', function () {
        const stub = mocks.dbMock.get
        expect(stub.callCount).to.equal(2)
        expect(stub.firstCall.args).to.deep.equal(['connection', { agent_connection_id: 'agent-connection-id' }])
        expect(stub.secondCall.args).to.deep.equal(['query', { id: 'query-id', role: 'requester' }])
      })

      it('should call submitDrpcResponse correctly', function () {
        const stub = mocks.cloudagentMock.submitDrpcResponse
        expect(stub.callCount).to.equal(1)
        expect(stub.firstCall.args).to.deep.equal([
          'request-id',
          {
            result: {
              type: 'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_ack/0.1',
            },
          },
        ])
      })
      it('should update a query in the database and insert a query_rpc', function () {
        const stub = mocks.dbMock.update
        const stub1 = mocks.dbMock.get
        const stub2 = mocks.dbMock.insert
        expect(stub.callCount).to.equal(1)
        expect(stub1.callCount).to.equal(2)
        expect(stub.firstCall.args).to.deep.equal([
          'query',
          { id: 'query-id' },
          {
            response: {
              mass: 3456,
              unit: 'kg',
              partialResponses: [],
              subjectId: {
                idType: 'product_and_quantity',
                content: { productId: 'product-id', quantity: 42 },
              },
            },
            status: 'resolved',
          },
        ])
        expect(stub2.firstCall.args).to.deep.equal([
          'query_rpc',
          {
            query_id: 'query-id',
            method: 'submit_query_response',
            role: 'server',
            agent_rpc_id: 'request-id',
            result: {
              type: 'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_ack/0.1',
            },
          },
        ])
      })
    })
    describe('missing response', function () {
      let mocks: ReturnType<typeof withDrpcEventMocks>
      beforeEach(async function () {
        clock.reset()
        mocks = withDrpcEventMocks()
        const drpcEvents = new DrpcEvents(...mocks.args)
        drpcEvents.start()
        mocks.eventsMock.emit('DrpcRequestStateChanged', {
          type: 'DrpcRequestStateChanged',
          payload: {
            drpcMessageRecord: {
              connectionId: 'agent-connection-id',
              role: 'server',
              state: 'request-received',
            },
          },
        })

        await clock.runAllAsync()
      })
      it('should not call any db or cloudagent methods', function () {
        const stubs = [
          mocks.cloudagentMock.submitDrpcResponse,
          mocks.dbMock.get,
          mocks.dbMock.update,
          mocks.dbMock.insert,
        ]
        for (const stub of stubs) {
          expect(stub.callCount).to.equal(0)
        }
      })
    })
    describe('bad params for response', function () {
      let mocks: ReturnType<typeof withDrpcEventMocks>
      beforeEach(async function () {
        clock.reset()
        mocks = withDrpcEventMocks()
        const drpcEvents = new DrpcEvents(...mocks.args)
        drpcEvents.start()
        mocks.eventsMock.emit('DrpcRequestStateChanged', {
          type: 'DrpcRequestStateChanged',
          payload: {
            drpcMessageRecord: {
              request: {
                ...goodResponse,
                params: {},
              },
              connectionId: 'agent-connection-id',
              role: 'server',
              state: 'request-received',
            },
          },
        })

        await clock.runAllAsync()
      })

      it('should submit an error response', function () {
        const stub = mocks.cloudagentMock.submitDrpcResponse
        expect(stub.callCount).to.equal(1)
        expect(stub.firstCall.args).to.deep.equal([
          'request-id',
          {
            error: {
              code: -32602,
              message: 'invalid params object',
            },
          },
        ])
      })

      it('should not call any db', function () {
        const stubs = [mocks.dbMock.get, mocks.dbMock.update, mocks.dbMock.insert]
        for (const stub of stubs) {
          expect(stub.callCount).to.equal(0)
        }
      })
    })
    describe('invalid query in response', function () {
      let mocks: ReturnType<typeof withDrpcEventMocks>
      beforeEach(async function () {
        clock.reset()
        mocks = withDrpcEventMocks()
        const drpcEvents = new DrpcEvents(...mocks.args)
        drpcEvents.start()
        mocks.eventsMock.emit('DrpcRequestStateChanged', {
          type: 'DrpcRequestStateChanged',
          payload: {
            drpcMessageRecord: {
              request: {
                ...goodResponse,
                params: {
                  ...goodRequest.params,
                  query: 'invalid_query',
                },
              },
              connectionId: 'agent-connection-id',
              role: 'server',
              state: 'request-received',
            },
          },
        })

        await clock.runAllAsync()
      })

      it('should submit an error response', function () {
        const stub = mocks.cloudagentMock.submitDrpcResponse
        expect(stub.callCount).to.equal(1)
        expect(stub.firstCall.args).to.deep.equal([
          'request-id',
          {
            error: {
              code: -32602,
              message: 'invalid params object',
            },
          },
        ])
      })
    })
    describe('unknown agent connection', function () {
      let mocks: ReturnType<typeof withDrpcEventMocks>
      beforeEach(async function () {
        clock.reset()
        mocks = withDrpcEventMocks()
        mocks.dbMock.get = sinon.stub().resolves([])
        const drpcEvents = new DrpcEvents(...mocks.args)
        drpcEvents.start()
        mocks.eventsMock.emit('DrpcRequestStateChanged', {
          type: 'DrpcRequestStateChanged',
          payload: {
            drpcMessageRecord: {
              request: goodResponse,
              connectionId: 'invalid-agent-connection-id',
              role: 'server',
              state: 'request-received',
            },
          },
        })

        await clock.runAllAsync()
      })

      it('should get the relevant connection correctly', function () {
        const stub = mocks.dbMock.get
        expect(stub.callCount).to.equal(1)
        expect(stub.firstCall.args).to.deep.equal([
          'connection',
          { agent_connection_id: 'invalid-agent-connection-id' },
        ])
      })

      it('should not call any other db methods or submitDrpcResponse', function () {
        const stubs = [mocks.cloudagentMock.submitDrpcResponse, mocks.dbMock.update, mocks.dbMock.insert]
        for (const stub of stubs) {
          expect(stub.callCount).to.equal(0)
        }
      })
    })
    describe('method throwing before query update', function () {
      let mocks: ReturnType<typeof withDrpcEventMocks>
      beforeEach(async function () {
        clock.reset()
        mocks = withDrpcEventMocks()
        mocks.dbMock.get = sinon.stub().rejects(new Error())
        const drpcEvents = new DrpcEvents(...mocks.args)
        drpcEvents.start()
        mocks.eventsMock.emit('DrpcRequestStateChanged', {
          type: 'DrpcRequestStateChanged',
          payload: {
            drpcMessageRecord: {
              request: goodResponse,
              connectionId: 'agent-connection-id',
              role: 'server',
              state: 'request-received',
            },
          },
        })

        await clock.runAllAsync()
      })

      it('should get the relevant connection correctly', function () {
        const stub = mocks.dbMock.get
        expect(stub.callCount).to.equal(1)
        expect(stub.firstCall.args).to.deep.equal(['connection', { agent_connection_id: 'agent-connection-id' }])
      })

      it('should submit an error response', function () {
        const stub = mocks.cloudagentMock.submitDrpcResponse
        expect(stub.callCount).to.equal(1)
        expect(stub.firstCall.args).to.deep.equal([
          'request-id',
          {
            error: {
              code: -32603,
              message: 'Internal error',
            },
          },
        ])
      })

      it('should not call any other db methods', function () {
        const stubs = [mocks.dbMock.update, mocks.dbMock.insert]
        for (const stub of stubs) {
          expect(stub.callCount).to.equal(0)
        }
      })
    })
    describe('method throwing after query update', function () {
      let mocks: ReturnType<typeof withDrpcEventMocks>
      beforeEach(async function () {
        clock.reset()
        mocks = withDrpcEventMocks()
        mocks.cloudagentMock.submitDrpcResponse = sinon.stub().rejects(new Error())
        const drpcEvents = new DrpcEvents(...mocks.args)
        drpcEvents.start()
        mocks.eventsMock.emit('DrpcRequestStateChanged', {
          type: 'DrpcRequestStateChanged',
          payload: {
            drpcMessageRecord: {
              request: goodResponse,
              connectionId: 'agent-connection-id',
              role: 'server',
              state: 'request-received',
            },
          },
        })

        await clock.runAllAsync()
      })

      it('should get the relevant connection correctly', function () {
        const stub = mocks.dbMock.get
        expect(stub.callCount).to.equal(2)
        expect(stub.firstCall.args).to.deep.equal(['connection', { agent_connection_id: 'agent-connection-id' }])
        expect(stub.secondCall.args).to.deep.equal(['query', { id: 'query-id', role: 'requester' }])
      })

      it('should insert into the database a query and query_rpc', function () {
        const stub = mocks.dbMock.update
        expect(stub.callCount).to.equal(1)
        expect(stub.firstCall.args).to.deep.equal([
          'query',
          { id: 'query-id' },
          {
            response: {
              mass: 3456,
              unit: 'kg',
              partialResponses: [],
              subjectId: {
                idType: 'product_and_quantity',
                content: { productId: 'product-id', quantity: 42 },
              },
            },
            status: 'resolved',
          },
        ])
      })

      it('should submit an error response', function () {
        const stub = mocks.cloudagentMock.submitDrpcResponse
        expect(stub.callCount).to.equal(2)
        expect(stub.secondCall.args).to.deep.equal([
          'request-id',
          {
            error: {
              code: -32603,
              message: 'Internal error',
            },
          },
        ])
      })
    })
  })
})
