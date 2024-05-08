import { describe, it } from 'mocha'
import sinon from 'sinon'

import { counterMock, mockLogger, templateMock, toHTMLString } from './helpers'

import { RootController } from '../example'

describe('ExampleController', () => {
  let expect: Chai.ExpectStatic
  before(async () => {
    expect = (await import('chai')).expect
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('get', () => {
    it('should return rendered root template', async () => {
      const controller = new RootController(counterMock, templateMock, mockLogger)
      const result = await controller.get().then(toHTMLString)
      expect(result).to.equal('root_TSOA HTMX demo_root')
    })
  })

  describe('counter', () => {
    it('should return rendered counter template', async () => {
      const controller = new RootController(counterMock, templateMock, mockLogger)
      const triggerEventSpy = sinon.spy(controller, 'triggerEvent')
      const result = await controller.getCounter().then(toHTMLString)
      expect(result).to.equal('counter')
      expect(triggerEventSpy.callCount).to.equal(1)
      expect(triggerEventSpy.calledWith('counter-loaded')).to.equal(true)
    })
  })

  describe('buttonClick', () => {
    it('should return rendered button template', async () => {
      const controller = new RootController(counterMock, templateMock, mockLogger)
      const incrementSpy = sinon.spy(counterMock, 'increment')
      const triggerEventSpy = sinon.spy(controller, 'triggerEvent')
      const result = await controller.buttonClick().then(toHTMLString)

      expect(result).to.equal('button_true_button')
      expect(incrementSpy.callCount).to.equal(1)
      expect(triggerEventSpy.callCount).to.equal(1)
      expect(triggerEventSpy.calledWith('button-click')).to.equal(true)
    })
  })

  describe('button', () => {
    it('should return rendered button template', async () => {
      const controller = new RootController(counterMock, templateMock, mockLogger)
      const incrementSpy = sinon.spy(counterMock, 'increment')
      const triggerEventSpy = sinon.spy(controller, 'triggerEvent')
      const result = await controller.button().then(toHTMLString)

      expect(result).to.equal('button_false_button')
      expect(incrementSpy.called).to.equal(false)
      expect(triggerEventSpy.called).to.equal(false)
    })
  })
})
