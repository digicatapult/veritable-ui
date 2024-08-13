import { expect } from 'chai'
import { beforeEach, describe, it } from 'mocha'
import sinon from 'sinon'

import DrpcEvents from '../index.js'
import { withDrpcEventMocks } from './helpers.js'

const goodRequest = {
  id: 'request-id',
  jsonrpc: '2.0',
  method: 'submit_query_request',
  params: {
    query: 'Scope 3 Carbon Consumption',
    productId: 'product-id',
    quantity: 42,
    queryIdForResponse: 'fb45f64a-7c2b-43e8-85c2-da66a6899446',
  },
}
const goodResponse = {
  id: 'request-id',
  jsonrpc: '2.0',
  method: 'submit_query_response',
  params: {
    query: 'Scope 3 Carbon Consumption',
    productId: 'product-id',
    quantity: 42,
    emissions: '3456',
    queryIdForResponse: 'query-id',
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
        expect(stub.firstCall.args).to.deep.equal(['request-id', { result: { state: 'accepted' } }])
      })

      it('should insert into the database a query and query_rpc', function () {
        const stub = mocks.dbMock.insert
        expect(stub.callCount).to.equal(2)
        expect(stub.firstCall.args).to.deep.equal([
          'query',
          {
            connection_id: 'connection-id',
            status: 'pending_your_input',
            query_type: 'Scope 3 Carbon Consumption',
            details: { productId: 'product-id', quantity: 42 },
            query_id_for_response: 'fb45f64a-7c2b-43e8-85c2-da66a6899446',
            query_response: null,
          },
        ])
        expect(stub.secondCall.args).to.deep.equal([
          'query_rpc',
          {
            query_id: 'query-id',
            method: 'submit_query_request',
            role: 'server',
            agent_rpc_id: 'request-id',
            result: { state: 'accepted' },
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
            query_type: 'Scope 3 Carbon Consumption',
            details: { productId: 'product-id', quantity: 42 },
            query_id_for_response: 'fb45f64a-7c2b-43e8-85c2-da66a6899446',
            query_response: null,
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
        console.log(stub)
        expect(stub.callCount).to.equal(2)
        expect(stub.firstCall.args).to.deep.equal(['connection', { agent_connection_id: 'agent-connection-id' }])
        expect(stub.secondCall.args).to.deep.equal(['query', { id: 'query-id' }])
      })

      it('should call submitDrpcResponse correctly', function () {
        const stub = mocks.cloudagentMock.submitDrpcResponse
        expect(stub.callCount).to.equal(1)
        expect(stub.firstCall.args).to.deep.equal(['request-id', { result: { state: 'accepted' } }])
      })
      it('should update a query in the database and insert a query_rpc', function () {
        const stub = mocks.dbMock.update
        const stub1 = mocks.dbMock.get
        expect(stub.callCount).to.equal(1)
        expect(stub1.callCount).to.equal(2)
        expect(stub.firstCall.args).to.deep.equal([
          'query',
          { id: 'query-id' },
          { query_response: '3456', status: 'resolved' },
        ])
        expect(stub.secondCall.args).to.deep.equal([
          'query_rpc',
          {
            query_id: 'query-id',
            method: 'submit_query_request',
            role: 'server',
            agent_rpc_id: 'request-id',
            result: { state: 'accepted' },
          },
        ])
      })
    })
  })
})
