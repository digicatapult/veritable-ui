import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'

import { toHTMLString, withConnectionMocks } from './helpers.js'

import { ConnectionController } from '../index.js'
import { validConnection } from './fixtures.js'

describe('ConnectionController', () => {
  afterEach(() => {
    sinon.restore()
  })

  describe('listConnections', () => {
    it('should return rendered list template', async () => {
      let { args } = withConnectionMocks()
      // MATT: wanted to import from withNewConnection mocks
      // and update all the tests below
      const controller = new ConnectionController(...args)
      const result = await controller.listConnections().then(toHTMLString)
      expect(result).to.equal('list_foo-unverified_list')
    })

    it('should call db as expected', async () => {
      let { dbMock, args } = withConnectionMocks()
      const controller = new ConnectionController(...args)
      const spy: sinon.SinonSpy = sinon.spy(dbMock, 'get')
      await controller.listConnections().then(toHTMLString)
      expect(spy.calledWith('connection', {}, [['updated_at', 'desc']])).to.equal(true)
    })
    it('should call db as expected', async () => {
      let { dbMock, args } = withConnectionMocks()
      const controller = new ConnectionController(...args)
      const spy: sinon.SinonSpy = sinon.spy(dbMock, 'get')
      await controller.listConnections('dig').then(toHTMLString)
      const search = 'dig'
      const query = search ? [['company_name', 'ILIKE', `%${search}%`]] : {}
      expect(spy.calledWith('connection', query, [['updated_at', 'desc']])).to.equal(true)
    })
  })

  describe('renderPinCode', () => {
    it('should render form', async () => {
      let { args } = withConnectionMocks()
      const controller = new ConnectionController(...args)
      const result = await controller.renderPinCode(validConnection.id, '123456').then(toHTMLString)
      expect(result).to.equal('renderPinForm_4a5d4085-5924-43c6-b60d-754440332e3d-123456-false_renderPinForm')
    })
  })

  describe('submitPinCode', () => {
    it('should render error if it is longer than 6 digits', async () => {
      let { args } = withConnectionMocks()
      const controller = new ConnectionController(...args)
      const result = await controller
        .submitPinCode({ action: 'submitPinCode', pin: '123456782' }, validConnection.id)
        .then(toHTMLString)
      expect(result).to.equal('renderPinForm_4a5d4085-5924-43c6-b60d-754440332e3d-123456782-false_renderPinForm')
    })

    it('also should render error if it combined characters and numbers', async () => {
      let { args } = withConnectionMocks()
      const controller = new ConnectionController(...args)
      const result = await controller
        .submitPinCode({ action: 'submitPinCode', pin: '1235235asdasd' }, validConnection.id)
        .then(toHTMLString)
      expect(result).to.equal('renderPinForm_4a5d4085-5924-43c6-b60d-754440332e3d-1235235asdasd-false_renderPinForm')
    })

    it('should accept only numbers', async () => {
      let { args } = withConnectionMocks()
      const controller = new ConnectionController(...args)
      const result = await controller
        .submitPinCode({ action: 'submitPinCode', pin: 'not-valid-code' }, validConnection.id)
        .then(toHTMLString)
      expect(result).to.equal('renderPinForm_4a5d4085-5924-43c6-b60d-754440332e3d-not-valid-code-false_renderPinForm')
    })

    it('renders a success screen', async () => {
      let { args, cloudagentMock } = withConnectionMocks()
      const controller = new ConnectionController(...args)
      const result = await controller
        .submitPinCode({ action: 'submitPinCode', pin: '111111' }, validConnection.id)
        .then(toHTMLString)
      expect(result).to.equal('renderSuccess_foo-2_renderSuccess')
      expect(cloudagentMock.proposeCredential.calledOnce).to.equal(true)
      expect(cloudagentMock.proposeCredential.firstCall.args).to.deep.equal([
        'AGENT_CONNECTION_ID',
        {
          schemaName: 'COMPANY_DETAILS',
          schemaVersion: '1.0.0',
          attributes: [
            {
              name: 'company_name',
              value: 'COMPANY_NAME',
            },
            {
              name: 'company_number',
              value: 'COMPANY_NUMBER',
            },
            {
              name: 'pin',
              value: '111111',
            },
          ],
        },
      ])
    })
  })
})
