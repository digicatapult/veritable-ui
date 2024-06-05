import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'

import { toHTMLString, withConnectionMocks } from './helpers.js'

import { ConnectionController } from '../index.js'

describe('ConnectionController', () => {
  afterEach(() => {
    sinon.restore()
  })

  describe('listConnections', () => {
    it('should return rendered list template', async () => {
      let { dbMock, mockLogger, templateMock } = withConnectionMocks()
      const controller = new ConnectionController(dbMock, templateMock, mockLogger)
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
})
