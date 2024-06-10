import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'

import { toHTMLString, withNewConnectionMocks } from './helpers.js'

import { NewConnectionController } from '../newConnection.js'
import {
  invalidCompanyNumber,
  notFoundCompanyNumber,
  validCompanyNumber,
  validCompanyNumberInDispute,
  validCompanyNumberInactive,
  validExistingCompanyNumber,
} from './fixtures.js'

describe('NewConnectionController', () => {
  afterEach(() => {
    sinon.restore()
  })

  describe('newConnectionForm', () => {
    it('should return rendered form template (fromInvite = false)', async () => {
      let { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.newConnectionForm().then(toHTMLString)
      expect(result).to.equal('newInvitePage_message_newInvitePage')
    })

    it('should return rendered form template (fromInvite = true)', async () => {
      let { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.newConnectionForm(true).then(toHTMLString)
      expect(result).to.equal('fromInvitePage_message_fromInvitePage')
    })
  })

  describe('verifyCompanyForm', () => {
    it('should return form page when company number invalid', async () => {
      let { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyCompanyForm(invalidCompanyNumber).then(toHTMLString)
      expect(result).to.equal('newInvitePage_message_newInvitePage')
    })

    it('should return rendered error when company not found', async () => {
      let { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyCompanyForm(notFoundCompanyNumber).then(toHTMLString)
      expect(result).to.equal('companyFormInput_error--Company number does not exist-form--00000000_companyFormInput')
    })

    it('should return rendered error when company already connected', async () => {
      let { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyCompanyForm(validExistingCompanyNumber).then(toHTMLString)
      expect(result).to.equal(
        'companyFormInput_error--Connection already exists with NAME2-form--00000002_companyFormInput'
      )
    })

    it('should return rendered error when company registered office in dispute', async () => {
      let { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyCompanyForm(validCompanyNumberInDispute).then(toHTMLString)
      expect(result).to.equal(
        'companyFormInput_error--Cannot validate company NAME3 as address is currently in dispute-form--00000003_companyFormInput'
      )
    })

    it('should return rendered error when company not active', async () => {
      let { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyCompanyForm(validCompanyNumberInactive).then(toHTMLString)
      expect(result).to.equal('companyFormInput_error--Company NAME4 is not active-form--00000004_companyFormInput')
    })

    it('should return success form', async () => {
      let { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyCompanyForm(validCompanyNumber).then(toHTMLString)
      expect(result).to.equal('companyFormInput_companyFound-NAME--form--00000001_companyFormInput')
    })
  })

  describe('submitNewInvite', () => {
    it('should return rendered error when company not found', async () => {
      let { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitNewInvite({
          companyNumber: notFoundCompanyNumber,
          email: 'alice@example.com',
          action: 'continue',
        })
        .then(toHTMLString)
      expect(result).to.equal(
        'companyFormInput_error--Company number does not exist-form-alice@example.com-00000000_companyFormInput'
      )
    })

    it('should return rendered error when company already connected', async () => {
      let { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitNewInvite({
          companyNumber: validExistingCompanyNumber,
          email: 'alice@example.com',
          action: 'continue',
        })
        .then(toHTMLString)
      expect(result).to.equal(
        'companyFormInput_error--Connection already exists with NAME2-form-alice@example.com-00000002_companyFormInput'
      )
    })

    it('should return rendered error when company registered office in dispute', async () => {
      let { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitNewInvite({
          companyNumber: validCompanyNumberInDispute,
          email: 'alice@example.com',
          action: 'continue',
        })
        .then(toHTMLString)
      expect(result).to.equal(
        'companyFormInput_error--Cannot validate company NAME3 as address is currently in dispute-form-alice@example.com-00000003_companyFormInput'
      )
    })

    it('should return rendered error when company not active', async () => {
      let { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitNewInvite({
          companyNumber: validCompanyNumberInactive,
          email: 'alice@example.com',
          action: 'continue',
        })
        .then(toHTMLString)
      expect(result).to.equal(
        'companyFormInput_error--Company NAME4 is not active-form-alice@example.com-00000004_companyFormInput'
      )
    })

    it('should return confirmation form if button is not Submit', async () => {
      let { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitNewInvite({
          companyNumber: validCompanyNumber,
          email: 'alice@example.com',
          action: 'continue',
        })
        .then(toHTMLString)
      expect(result).to.equal(
        'companyFormInput_companyFound-NAME--confirmation-alice@example.com-00000001_companyFormInput'
      )
    })

    it('should return rendered error when unique constraint is violated', async () => {
      let { mockTransactionDb, args } = withNewConnectionMocks()

      sinon
        .stub(mockTransactionDb, 'insert')
        .rejects(new Error('details - duplicate key value violates unique constraint "unq_connection_company_number"'))

      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitNewInvite({
          companyNumber: validCompanyNumber,
          email: 'alice@example.com',
          action: 'submit',
        })
        .then(toHTMLString)

      expect(result).to.equal(
        'companyFormInput_error--Connection already exists with NAME-form-alice@example.com-00000001_companyFormInput'
      )
    })

    it('should return success even if email send fails', async () => {
      let { args, mockEmail } = withNewConnectionMocks()

      sinon.stub(mockEmail, 'sendMail').rejects(new Error())

      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitNewInvite({
          companyNumber: validCompanyNumber,
          email: 'alice@example.com',
          action: 'submit',
        })
        .then(toHTMLString)

      expect(result).to.equal('companyFormInput_companyFound-NAME--success-alice@example.com-00000001_companyFormInput')
    })

    describe('happy path assertions', function () {
      let clock: sinon.SinonFakeTimers
      let insertSpy: sinon.SinonSpy
      let emailSpy: sinon.SinonSpy
      let result: string

      beforeEach(async () => {
        let { mockTransactionDb, mockEmail, args } = withNewConnectionMocks()

        insertSpy = sinon.spy(mockTransactionDb, 'insert')
        emailSpy = sinon.spy(mockEmail, 'sendMail')
        clock = sinon.useFakeTimers(100)

        const controller = new NewConnectionController(...args)
        result = await controller
          .submitNewInvite({
            companyNumber: validCompanyNumber,
            email: 'alice@example.com',
            action: 'submit',
          })
          .then(toHTMLString)
      })

      afterEach(() => {
        clock.restore()
      })

      it('should return success form', () => {
        expect(result).to.equal(
          'companyFormInput_companyFound-NAME--success-alice@example.com-00000001_companyFormInput'
        )
      })

      it('should insert two row', () => {
        expect(insertSpy.callCount).to.equal(2)
      })

      it('should insert correct value into connection table', () => {
        expect(insertSpy.firstCall.args).deep.equal([
          'connection',
          {
            company_name: 'NAME',
            company_number: '00000001',
            status: 'pending',
            agent_connection_id: null,
          },
        ])
      })

      it('should insert correct value into connection_invite table', () => {
        expect(insertSpy.secondCall.args[0]).equal('connection_invite')
        const { pin_hash, ...rest } = insertSpy.secondCall.args[1]
        expect(rest).deep.equal({
          connection_id: '42',
          oob_invite_id: 'id-NAME',
          expires_at: new Date(100 + 14 * 24 * 60 * 60 * 1000),
        })
        expect(typeof pin_hash).to.equal('string')
      })

      it('should send two emails', () => {
        expect(emailSpy.callCount).equal(2)
      })

      it('should send first email to recipient', () => {
        const expectedInvite = { companyNumber: '07964699', inviteUrl: 'url-NAME' }
        const expectedInviteBase64 = Buffer.from(JSON.stringify(expectedInvite), 'utf8').toString('base64url')
        expect(emailSpy.firstCall.args).deep.equal([
          'connection_invite',
          {
            to: 'alice@example.com',
            invite: expectedInviteBase64,
          },
        ])
      })

      it('should send second email to admin', () => {
        expect(emailSpy.secondCall.args[0]).equal('connection_invite_admin')
        expect(emailSpy.secondCall.args[1]?.address).equal(
          'NAME\r\nADDRESS_LINE_1\r\nADDRESS_LINE_2\r\nCARE_OF\r\nLOCALITY\r\nPO_BOX\r\nPOSTAL_CODE\r\nCOUNTRY\r\nPREMISES\r\nREGION'
        )
        expect(emailSpy.secondCall.args[1]?.pin).match(/[0-9]{6}/)
      })
    })
  })
})
