import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'

import { mockLogger, toHTMLString } from '../../__tests__/helpers.js'
import { withConnectionMocks } from './helpers.js'

import { Request } from 'express'
import { CredentialsController } from '../index.js'
import { AliceCredentials, BobCredentials } from './fixtures.js'

describe('CredentialsController', () => {
  const req = { log: mockLogger } as unknown as Request

  afterEach(() => {
    sinon.restore()
  })

  describe('listCredentials', () => {
    it('should return rendered list of credentials template', async () => {
      const { args } = withConnectionMocks()
      const controller = new CredentialsController(...args)
      const result = await controller.listCredentials(req).then(toHTMLString)

      expect(result).to.equal(
        'listCredentials_issuer-done-DIGITAL CATAPULT-Supplier credentials-holder-done-DIGITAL CATAPULT-Supplier credentials-issuer-done-CARE ONUS LTD-Supplier credentials-holder-done-CARE ONUS LTD-Supplier credentials_listCredentials'
      )
    })

    it('pulls credentials from a cloudagent', async () => {
      const { cloudagentMock, args } = withConnectionMocks()
      const controller = new CredentialsController(...args)
      await controller.listCredentials(req, '').then(toHTMLString)
      const mockAgent = cloudagentMock.getCredentials

      expect(mockAgent.called).to.equal(true)
    })

    it('retrieves a connection for a credential', async () => {
      const { dbMock, args } = withConnectionMocks()
      const controller = new CredentialsController(...args)
      await controller.listCredentials(req, '').then(toHTMLString)
      const getCredetialsMock = dbMock.get

      expect(getCredetialsMock.lastCall.args).to.deep.equal([
        'connection',
        {
          agent_connection_id: '65e99592-1989-4087-b7a3-ee50695b3457',
        },
      ])
    })

    it('extracts companyName from db and stores along credential', async () => {
      const { templateMock, args } = withConnectionMocks()
      const controller = new CredentialsController(...args)
      await controller.listCredentials(req, '').then(toHTMLString)

      expect(templateMock.listPage.lastCall.args[0][0]).to.have.property('companyName')
      expect(templateMock.listPage.lastCall.args[0][1]).to.have.property('companyName')
      expect(templateMock.listPage.lastCall.args[0][2]).to.have.property('companyName')
      expect(templateMock.listPage.lastCall.args[0][3]).to.have.property('companyName')
    })

    it('filters by company name depending on search', async () => {
      const { templateMock, args } = withConnectionMocks()
      const controller = new CredentialsController(...args)
      await controller.listCredentials(req, 'digi').then(toHTMLString)

      expect(templateMock.listPage.lastCall.args[0].length).to.equal(2)
      expect(templateMock.listPage.lastCall.args[0][0])
        .to.have.property('companyName')
        .that.is.equal('DIGITAL CATAPULT')
      expect(templateMock.listPage.lastCall.args[0][1])
        .to.have.property('companyName')
        .that.is.equal('DIGITAL CATAPULT')
      expect(templateMock.listPage.lastCall.args[1]).to.equal('digi')
    })

    it('returns all valid credentials if search is not provided', async () => {
      const { templateMock, args } = withConnectionMocks()
      const controller = new CredentialsController(...args)
      await controller.listCredentials(req, '').then(toHTMLString)

      expect(templateMock.listPage.lastCall.args[0].length).to.deep.equal(4)
      templateMock.listPage.lastCall.args[0].forEach((credential: unknown) => {
        expect(credential).to.have.property('companyName')
      })
    })

    it('returns none of the credentials if no matches found for the search', async () => {
      const { templateMock, args } = withConnectionMocks()
      const controller = new CredentialsController(...args)
      const res = await controller.listCredentials(req, 'somethingThatshouldnotexist').then(toHTMLString)

      expect(res).to.equal('listCredentials__listCredentials')
      expect(templateMock.listPage.lastCall.args[0].length).to.deep.equal(0)
    })

    it('returns credentials list (alice)', async () => {
      const { cloudagentMock, args } = withConnectionMocks()
      const controller = new CredentialsController(...args)
      cloudagentMock.getCredentials.resolves(AliceCredentials)
      const res = await controller.listCredentials(req, '').then(toHTMLString)

      expect(res).to.equal(
        'listCredentials_issuer-done-CARE ONUS LTD-Supplier credentials-holder-done-CARE ONUS LTD-Supplier credentials_listCredentials'
      )
    })

    it('returns credentials list(bob)', async () => {
      const { cloudagentMock, args } = withConnectionMocks()
      const controller = new CredentialsController(...args)
      cloudagentMock.getCredentials.resolves(BobCredentials)
      const res = await controller.listCredentials(req, '').then(toHTMLString)

      expect(res).to.equal(
        'listCredentials_issuer-done-DIGITAL CATAPULT-Supplier credentials-holder-done-DIGITAL CATAPULT-Supplier credentials_listCredentials'
      )
    })
  })
})
