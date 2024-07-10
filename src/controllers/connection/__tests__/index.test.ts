import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'

import { toHTMLString, withConnectionMocks } from './helpers.js'

import { ConnectionController } from '../index.js'
import { withNewConnectionMocks } from './helpers.js'

describe('ConnectionController', () => {
  afterEach(() => {
    sinon.restore()
  })

  describe('listConnections', () => {
    it('should return rendered list template', async () => {
      let { mockDb, mockLogger, mockPinForm, mock } = withNewConnectionMocks()
      const controller = new ConnectionController(...args)
      const result = await controller.listConnections().then(toHTMLString)
      expect(result).to.equal('list_foo-verified_list')
    })

    it('should call db as expected', async () => {
      let { dbMock, mockLogger, templateMock } = withConnectionMocks()
      const controller = new ConnectionController(dbMock, templateMock, mockLogger)
      const spy = sinon.spy(dbMock, 'get')
      await controller.listConnections().then(toHTMLString)
      expect(spy.calledWith('connection', {}, [['updated_at', 'desc']])).to.equal(true)
    })
    it('should call db as expected', async () => {
      let { dbMock, mockLogger, templateMock } = withConnectionMocks()
      const controller = new ConnectionController(dbMock, templateMock, mockLogger)
      const spy = sinon.spy(dbMock, 'get')
      await controller.listConnections('dig').then(toHTMLString)
      const search = 'dig'
      const query = search ? [['company_name', 'ILIKE', `%${search}%`]] : {}
      expect(spy.calledWith('connection', query, [['updated_at', 'desc']])).to.equal(true)
    })
  })

  describe('fromInvitePin', () => {
    it('should render error if it is longer than 6 digits', async () => {
      let { args } = withNewConnectionMocks()
      const controller = new ConnectionController(...args)
      const result = await controller
        .submitPinCode({ action: 'submitPinCode', pin: '123456782' }, validConnection.id)
        .then(toHTMLString)
      expect(result).to.equal('renderSuccess_submitPinCode-123456782_renderSuccess')
    })

    it('also should render error if it combined characters and numbers', async () => {
      let { args } = withNewConnectionMocks()
      const controller = new ConnectionController(...args)
      const result = await controller
        .submitPinCode({ action: 'submitPinCode', pin: '1235235asdasd' }, validConnection.id)
        .then(toHTMLString)
      expect(result).to.equal('renderSuccess_submitPinCode-1235235asdasd_renderSuccess')
    })

    it('should accept only numbers', async () => {
      let { args } = withNewConnectionMocks()
      const controller = new ConnectionController(...args)
      const result = await controller
        .submitPinCode({ action: 'submitPinCode', pin: 'not-valid-code' }, validConnection.id)
        .then(toHTMLString)
      expect(result).to.equal('renderSuccess_submitPinCode-not-valid-code_renderSuccess')
    })

    it('renders a success screen', async () => {
      let { args } = withNewConnectionMocks()
      const controller = new ConnectionController(...args)
      const result = await controller
        .submitPinCode({ action: 'submitPinCode', pin: '111111' }, validConnection.id)
        .then(toHTMLString)
      expect(result).to.equal('renderSuccess_submitPinCode-111111_renderSuccess')
    })
  })
})
