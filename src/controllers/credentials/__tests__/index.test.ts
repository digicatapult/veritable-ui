import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'

import { toHTMLString, withConnectionMocks } from './helpers.js'

import { Request } from 'express'
import { AliceCredentials, BobCredentials } from '../../../views/credentials/__tests__/fixtures.js'
import { mockLogger } from '../../__tests__/helpers.js'
import { CredentialsController } from '../index.js'

// import { validConnection } from './fixtures.js'

describe.only('CredentialsController', () => {
  const req = { log: mockLogger } as unknown as Request

  afterEach(() => {
    sinon.restore()
  })

  describe('listCredentials', () => {
    it('should return rendered list of credentials template', async () => {
      const { args } = withConnectionMocks()
      const controller = new CredentialsController(...args)
      const result = await controller.listCredentials(req).then(toHTMLString)
      expect(result).to.equal('listCredentials_issuer-done-DIGITAL CATAPULT_listCredentials')
    })

    it('pulls credentials from a cloudagent', async () => {
      const { cloudagentMock, args } = withConnectionMocks()
      const controller = new CredentialsController(...args)
      await controller.listCredentials(req, '').then(toHTMLString)
      const mockAgent = cloudagentMock.getCredentials

      expect(mockAgent.called).to.equal(true)
    })

    it('returns credentials list', async () => {
      const { cloudagentMock, args } = withConnectionMocks()
      const controller = new CredentialsController(...args)
      cloudagentMock.getCredentials.resolves(AliceCredentials)
      const res = await controller.listCredentials(req, '').then(toHTMLString)

      expect(res).to.equal('listCredentials_issuer-done-DIGITAL CATAPULT_listCredentials')
    })

    it('returns credentials list', async () => {
      const { cloudagentMock, args } = withConnectionMocks()
      const controller = new CredentialsController(...args)
      cloudagentMock.getCredentials.resolves(BobCredentials)
      const res = await controller.listCredentials(req, '').then(toHTMLString)

      expect(res).to.equal('listCredentials_issuer-done-CARE ONUS LTD_listCredentials')
    })
  })
})
