import { expect } from 'chai'
import { afterEach, beforeEach, describe } from 'mocha'
import sinon from 'sinon'

import { EventData, TestIndexedAsyncEventEmitter, eventA, eventB } from './fixtures/testIndexedAsyncEventEmitter.js'

describe('IndexedAsyncEventEmitter', function () {
  let clock: sinon.SinonFakeTimers
  beforeEach(async () => {
    clock = sinon.useFakeTimers(0)
  })

  afterEach(async () => {
    clock.restore()
  })

  describe('emitIndexedEvent', function () {
    describe('emit single event', function () {
      let emitter: TestIndexedAsyncEventEmitter
      let handlerA: sinon.SinonStub
      let handlerB: sinon.SinonStub
      let event: EventData['A']

      beforeEach(async function () {
        emitter = new TestIndexedAsyncEventEmitter()
        handlerA = sinon.stub().resolves()
        handlerB = sinon.stub().resolves()
        event = eventA()

        emitter.on('A', handlerA)
        emitter.on('B', handlerB)
        emitter.emitIndexed('A', '1', event)
        await clock.nextAsync()
      })

      it('should call event handlerA', async function () {
        expect(handlerA.callCount).equal(1)
        expect(handlerA.firstCall.args.length).equal(1)
        expect(handlerA.firstCall.args[0]).equal(event)
      })

      it('should not call event handlerB', async function () {
        expect(handlerB.callCount).equal(0)
      })
    })

    describe('emit multiple distinct events same type', function () {
      let emitter: TestIndexedAsyncEventEmitter
      let handlerA: sinon.SinonStub
      let handlerB: sinon.SinonStub
      let event1: EventData['A']
      let event2: EventData['A']

      beforeEach(async function () {
        emitter = new TestIndexedAsyncEventEmitter()
        handlerA = sinon.stub().resolves()
        handlerB = sinon.stub().resolves()
        event1 = eventA('1')
        event2 = eventA('2')

        emitter.on('A', handlerA)
        emitter.on('B', handlerB)
        emitter.emitIndexed('A', '1', event1)
        emitter.emitIndexed('A', '1', event2)
        await clock.runAllAsync()
      })

      it('should call event handler twice', async function () {
        expect(handlerA.callCount).equal(2)
        expect(handlerA.firstCall.args.length).equal(1)
        expect(handlerA.firstCall.args[0]).equal(event1)
        expect(handlerA.secondCall.args.length).equal(1)
        expect(handlerA.secondCall.args[0]).equal(event2)
      })

      it('should not call event handlerB', async function () {
        expect(handlerB.callCount).equal(0)
      })
    })

    describe('emit multiple distinct events different types', function () {
      let emitter: TestIndexedAsyncEventEmitter
      let handlerA: sinon.SinonStub
      let handlerB: sinon.SinonStub
      let event1: EventData['A']
      let event2: EventData['B']

      beforeEach(async function () {
        emitter = new TestIndexedAsyncEventEmitter()
        handlerA = sinon.stub().resolves()
        handlerB = sinon.stub().resolves()
        event1 = eventA('1')
        event2 = eventB('2')

        emitter.on('A', handlerA)
        emitter.on('B', handlerB)
        emitter.emitIndexed('A', '1', event1)
        emitter.emitIndexed('B', '1', event2)
        await clock.runAllAsync()
      })

      it('should call event handlerA', async function () {
        expect(handlerA.callCount).equal(1)
        expect(handlerA.firstCall.args.length).equal(1)
        expect(handlerA.firstCall.args[0]).equal(event1)
      })

      it('should call event handlerB', async function () {
        expect(handlerB.callCount).equal(1)
        expect(handlerB.firstCall.args.length).equal(1)
        expect(handlerB.firstCall.args[0]).equal(event2)
      })
    })

    describe('event handler retry', function () {
      let emitter: TestIndexedAsyncEventEmitter
      let handlerA: sinon.SinonStub
      let handlerB: sinon.SinonStub
      let event: EventData['A']

      beforeEach(async function () {
        emitter = new TestIndexedAsyncEventEmitter()
        handlerA = sinon.stub().onFirstCall().rejects(new Error()).onSecondCall().resolves()
        handlerB = sinon.stub().resolves()
        event = eventA()
        emitter.on('A', handlerA)
        emitter.on('B', handlerB)
        emitter.emitIndexed('A', '1', event)
        await clock.tickAsync(0)
      })

      it('should call event handlerA once', async function () {
        expect(handlerA.callCount).equal(1)
        expect(handlerA.firstCall.args.length).equal(1)
        expect(handlerA.firstCall.args[0]).equal(event)
      })

      it('should not call event handlerB', async function () {
        expect(handlerB.callCount).equal(0)
      })

      it('should call handlerA again after 500ms', async function () {
        await clock.tickAsync(500)
        expect(handlerA.callCount).equal(2)
        expect(handlerA.secondCall.args.length).equal(1)
        expect(handlerA.secondCall.args[0]).equal(event)
      })
    })

    describe('event handler retry (n)', function () {
      let emitter: TestIndexedAsyncEventEmitter
      let handlerA: sinon.SinonStub
      let handlerB: sinon.SinonStub
      let event: EventData['A']

      beforeEach(async function () {
        emitter = new TestIndexedAsyncEventEmitter()
        handlerA = sinon.stub().rejects(new Error()).onCall(3).resolves()
        handlerB = sinon.stub().resolves()
        event = eventA()
        emitter.on('A', handlerA)
        emitter.on('B', handlerB)
        emitter.emitIndexed('A', '1', event)
        await clock.tickAsync(0)
      })

      it('should call event handlerA once', async function () {
        expect(handlerA.callCount).equal(1)
        expect(handlerA.firstCall.args.length).equal(1)
        expect(handlerA.firstCall.args[0]).equal(event)
      })

      it('should not call event handlerB', async function () {
        expect(handlerB.callCount).equal(0)
      })

      it('should call handlerA again after 500ms', async function () {
        await clock.tickAsync(500)
        expect(handlerA.callCount).equal(2)
        expect(handlerA.secondCall.args.length).equal(1)
        expect(handlerA.secondCall.args[0]).equal(event)
      })

      it('should call handlerA again after 1500ms', async function () {
        await clock.tickAsync(1500)
        expect(handlerA.callCount).equal(3)
        expect(handlerA.thirdCall.args.length).equal(1)
        expect(handlerA.thirdCall.args[0]).equal(event)
      })
    })

    describe("event handler doesn't retry with subsequent event matching type and index", function () {
      let emitter: TestIndexedAsyncEventEmitter
      let handlerA: sinon.SinonStub
      let handlerB: sinon.SinonStub
      let event1: EventData['A']
      let event2: EventData['A']

      beforeEach(async function () {
        emitter = new TestIndexedAsyncEventEmitter()
        handlerA = sinon.stub().rejects(new Error()).onSecondCall().resolves()
        handlerB = sinon.stub().resolves()
        event1 = eventA()
        event2 = eventA()
        emitter.on('A', handlerA)
        emitter.on('B', handlerB)
        emitter.emitIndexed('A', '1', event1)
        await clock.tickAsync(0)
        emitter.emitIndexed('A', '1', event2)
        await clock.tickAsync(0)
      })

      it('should call event handlerA once', async function () {
        expect(handlerA.callCount).equal(2)
        expect(handlerA.firstCall.args.length).equal(1)
        expect(handlerA.firstCall.args[0]).equal(event1)
        expect(handlerA.secondCall.args.length).equal(1)
        expect(handlerA.secondCall.args[0]).equal(event2)
      })

      it('should not call event handlerB', async function () {
        expect(handlerB.callCount).equal(0)
      })

      it("doesn't call handler again with old event after 500ms", async function () {
        await clock.tickAsync(500)
        expect(handlerA.callCount).equal(2)
      })
    })

    describe('event handler retry with subsequent event non-matching type', function () {
      let emitter: TestIndexedAsyncEventEmitter
      let handlerA: sinon.SinonStub
      let handlerC: sinon.SinonStub
      let event1: EventData['A']
      let event2: EventData['A']

      beforeEach(async function () {
        emitter = new TestIndexedAsyncEventEmitter()
        handlerA = sinon.stub().resolves().onFirstCall().rejects(new Error())
        handlerC = sinon.stub().resolves()
        event1 = eventA()
        event2 = eventA()
        emitter.on('A', handlerA)
        emitter.on('C', handlerC)
        emitter.emitIndexed('A', '1', event1)
        await clock.tickAsync(0)
        emitter.emitIndexed('C', '1', event2)
        await clock.tickAsync(0)
      })

      it('should call event handlerA once', async function () {
        expect(handlerA.callCount).equal(1)
        expect(handlerA.firstCall.args.length).equal(1)
        expect(handlerA.firstCall.args[0]).equal(event1)
      })

      it('should call event handlerC once', async function () {
        expect(handlerC.callCount).equal(1)
        expect(handlerC.firstCall.args.length).equal(1)
        expect(handlerC.firstCall.args[0]).equal(event2)
      })

      it('calls handler again with old event after 500ms', async function () {
        await clock.tickAsync(500)
        expect(handlerA.callCount).equal(2)
        expect(handlerA.secondCall.args.length).equal(1)
        expect(handlerA.secondCall.args[0]).equal(event1)
      })
    })

    describe('event handler retry with subsequent event non-matching index', function () {
      let emitter: TestIndexedAsyncEventEmitter
      let handlerA: sinon.SinonStub
      let event1: EventData['A']
      let event2: EventData['A']

      beforeEach(async function () {
        emitter = new TestIndexedAsyncEventEmitter()
        handlerA = sinon.stub().resolves().onFirstCall().rejects(new Error())
        event1 = eventA()
        event2 = eventA()
        emitter.on('A', handlerA)
        emitter.emitIndexed('A', '1', event1)
        await clock.tickAsync(0)
        emitter.emitIndexed('A', '2', event2)
        await clock.tickAsync(0)
      })

      it('should call event handlerA twice', async function () {
        expect(handlerA.callCount).equal(2)
        expect(handlerA.firstCall.args.length).equal(1)
        expect(handlerA.firstCall.args[0]).equal(event1)
        expect(handlerA.secondCall.args.length).equal(1)
        expect(handlerA.secondCall.args[0]).equal(event2)
      })

      it('calls handler again with old event after 500ms', async function () {
        await clock.tickAsync(500)
        expect(handlerA.callCount).equal(3)
        expect(handlerA.thirdCall.args.length).equal(1)
        expect(handlerA.thirdCall.args[0]).equal(event1)
      })
    })
  })
})
