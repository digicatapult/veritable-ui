import { expect } from 'chai'
import express from 'express'
import { describe, it } from 'mocha'
import sinon from 'sinon'

import { toHTMLString, withConnectionMocks } from './helpers.js'

import { ConnectionController } from '../index.js'
import { validConnection } from './fixtures.js'

describe('ConnectionController', () => {
  const mockReq = { id: 'test-unit_req-id' } as express.Request

  afterEach(() => {
    sinon.restore()
  })

  describe('listConnections', () => {
    it('should return rendered list template', async () => {
      const { args } = withConnectionMocks(null, null, 'pending')
      const controller = new ConnectionController(...args)
      const result = await controller.listConnections(mockReq).then(toHTMLString)
      expect(result).to.equal('list_foo-unverified_list')
    })

    it('should call db as expected', async () => {
      const { dbMock, args } = withConnectionMocks(null, null, 'pending')
      const controller = new ConnectionController(...args)
      const spy: sinon.SinonSpy = sinon.spy(dbMock, 'get')
      await controller.listConnections(mockReq).then(toHTMLString)
      expect(spy.calledWith('connection', {}, [['updated_at', 'desc']])).to.equal(true)
    })
    it('should call db as expected', async () => {
      const { dbMock, args } = withConnectionMocks(null, null, 'pending')
      const controller = new ConnectionController(...args)
      const spy: sinon.SinonSpy = sinon.spy(dbMock, 'get')
      await controller.listConnections(mockReq, 'dig').then(toHTMLString)
      const search = 'dig'
      const query = search ? [['company_name', 'ILIKE', `%${search}%`]] : {}
      expect(spy.calledWith('connection', query, [['updated_at', 'desc']])).to.equal(true)
    })
  })

  describe('renderPinCode', () => {
    it('should render form', async () => {
      const { args } = withConnectionMocks(null, null, 'pending')
      const controller = new ConnectionController(...args)
      const result = await controller.renderPinCode(mockReq, validConnection.id, '123456').then(toHTMLString)
      expect(result).to.equal('renderPinForm_4a5d4085-5924-43c6-b60d-754440332e3d-123456-false-x_renderPinForm')
    })
  })

  describe('submitPinCode', () => {
    it('should render error if it is longer than 6 digits', async () => {
      const { args } = withConnectionMocks(null, null, 'pending')
      const controller = new ConnectionController(...args)
      const result = await controller
        .submitPinCode(mockReq, { action: 'submitPinCode', pin: '123456782' }, validConnection.id)
        .then(toHTMLString)
      expect(result).to.equal('renderPinForm_4a5d4085-5924-43c6-b60d-754440332e3d-123456782-false-x_renderPinForm')
    })

    it('also should render error if it combined characters and numbers', async () => {
      const { args } = withConnectionMocks(null, null, 'pending')
      const controller = new ConnectionController(...args)
      const result = await controller
        .submitPinCode(mockReq, { action: 'submitPinCode', pin: '1235235asdasd' }, validConnection.id)
        .then(toHTMLString)
      expect(result).to.equal('renderPinForm_4a5d4085-5924-43c6-b60d-754440332e3d-1235235asdasd-false-x_renderPinForm')
    })

    it('should accept only numbers', async () => {
      const { args } = withConnectionMocks(null, null, 'pending')
      const controller = new ConnectionController(...args)
      const result = await controller
        .submitPinCode(mockReq, { action: 'submitPinCode', pin: 'not-valid-code' }, validConnection.id)
        .then(toHTMLString)
      expect(result).to.equal('renderPinForm_4a5d4085-5924-43c6-b60d-754440332e3d-not-valid-code-false-x_renderPinForm')
    })

    it('renders a success screen', async () => {
      const { args, cloudagentMock } = withConnectionMocks(null, null, 'verified_us')
      const controller = new ConnectionController(...args)
      const result = await controller
        .submitPinCode(mockReq, { action: 'submitPinCode', pin: '111111' }, validConnection.id)
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
    it('should return a success', async () => {
      const { args } = withConnectionMocks(null, null, 'verified_us')
      const controller = new ConnectionController(...args)
      const result = await controller
        .submitPinCode(mockReq, { action: 'submitPinCode', pin: '111111' }, validConnection.id)
        .then(toHTMLString)

      expect(result).to.equal('renderSuccess_foo-2_renderSuccess')
    })
    it('should return a form page', async () => {
      const { args } = withConnectionMocks(null, 4, 'pending')
      const controller = new ConnectionController(...args)
      const result = await controller
        .submitPinCode(mockReq, { action: 'submitPinCode', pin: '111112' }, validConnection.id)
        .then(toHTMLString)
      expect(result).to.equal(
        'renderPinForm_4a5d4085-5924-43c6-b60d-754440332e3d-111112-false-Sorry, your code is invalid. You have 4 attempts left before the PIN expires._renderPinForm'
      )
    })
    it('should return a success page with an error message', async () => {
      const { args } = withConnectionMocks(1, 0, 'pending')
      const controller = new ConnectionController(...args)
      const result = await controller
        .submitPinCode(mockReq, { action: 'submitPinCode', pin: '111111' }, validConnection.id)
        .then(toHTMLString)
      expect(result).to.equal(
        'renderError_foo-2-Maximum number of pin attempts has been reached, please reach out to the company you are attempting to connect to._renderError'
      )
    })
  })
})
