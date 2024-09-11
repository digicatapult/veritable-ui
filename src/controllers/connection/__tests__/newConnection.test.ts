import { expect } from 'chai'
import express from 'express'
import { describe, it } from 'mocha'
import sinon from 'sinon'

import { toHTMLString, withNewConnectionMocks } from './helpers.js'

import { NewConnectionController } from '../newConnection.js'
import {
  invalidBase64Invite,
  invalidCompanyNumber,
  invalidCompanyNumberInvite,
  invalidInvite,
  notFoundCompanyNumber,
  notFoundCompanyNumberInvite,
  validCompanyNumber,
  validCompanyNumberInDispute,
  validCompanyNumberInDisputeInvite,
  validCompanyNumberInactive,
  validCompanyNumberInactiveInvite,
  validCompanyNumberInvite,
  validExistingCompanyNumber,
  validExistingCompanyNumberInvite,
} from './fixtures.js'

describe('NewConnectionController', () => {
  const mockReq = { id: 'test-unit_req-id' } as express.Request

  afterEach(() => {
    sinon.restore()
  })

  describe('newConnectionForm', () => {
    it('should return rendered form template (fromInvite = false)', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.newConnectionForm().then(toHTMLString)
      expect(result).to.equal('newInvitePage_message_newInvitePage')
    })

    it('should return rendered form template (fromInvite = true)', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.newConnectionForm(true).then(toHTMLString)
      expect(result).to.equal('fromInvitePage_message_fromInvitePage')
    })
  })

  describe('verifyCompanyForm', () => {
    it('should return form page when company number invalid', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyCompanyForm(mockReq, invalidCompanyNumber).then(toHTMLString)
      expect(result).to.equal('newInvitePage_message_newInvitePage')
    })

    it('should return rendered error when company not found', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)

      const result = await controller.verifyCompanyForm(mockReq, notFoundCompanyNumber).then(toHTMLString)
      expect(result).to.equal('companyFormInput_error--Company number does not exist-form--00000000_companyFormInput')
    })

    it('should return rendered error when company already connected', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyCompanyForm(mockReq, validExistingCompanyNumber).then(toHTMLString)
      expect(result).to.equal(
        'companyFormInput_error--Connection already exists with NAME2-form--00000002_companyFormInput'
      )
    })

    it('should return rendered error when company registered office in dispute', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyCompanyForm(mockReq, validCompanyNumberInDispute).then(toHTMLString)
      expect(result).to.equal(
        'companyFormInput_error--Cannot validate company NAME3 as address is currently in dispute-form--00000003_companyFormInput'
      )
    })

    it('should return rendered error when company not active', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyCompanyForm(mockReq, validCompanyNumberInactive).then(toHTMLString)
      expect(result).to.equal('companyFormInput_error--Company NAME4 is not active-form--00000004_companyFormInput')
    })

    it('should return success form', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyCompanyForm(mockReq, validCompanyNumber).then(toHTMLString)
      expect(result).to.equal('companyFormInput_companyFound-NAME--form--00000001_companyFormInput')
    })
  })

  describe('verifyInviteForm', () => {
    it('should rendered page when invite is empty', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyInviteForm(mockReq, '').then(toHTMLString)
      expect(result).to.equal('fromInvitePage_message_fromInvitePage')
    })

    it('should rendered error when invite invalid base64', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyInviteForm(mockReq, invalidBase64Invite).then(toHTMLString)
      expect(result).to.equal('fromInviteForm_error--Invitation is not valid_fromInviteForm')
    })

    it('should rendered error when invite invalid format', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyInviteForm(mockReq, invalidInvite).then(toHTMLString)
      expect(result).to.equal('fromInviteForm_error--Invitation is not valid_fromInviteForm')
    })

    it('should rendered error when company number invalid', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyInviteForm(mockReq, invalidCompanyNumberInvite).then(toHTMLString)
      expect(result).to.equal('fromInviteForm_error--Invitation is not valid_fromInviteForm')
    })

    it('should return rendered error when company not found', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyInviteForm(mockReq, notFoundCompanyNumberInvite).then(toHTMLString)
      expect(result).to.equal('fromInviteForm_error--Company number does not exist_fromInviteForm')
    })

    it('should return rendered error when company already connected', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyInviteForm(mockReq, validExistingCompanyNumberInvite).then(toHTMLString)
      expect(result).to.equal('fromInviteForm_error--Connection already exists with NAME2_fromInviteForm')
    })

    it('should return rendered error when company registered office in dispute', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyInviteForm(mockReq, validCompanyNumberInDisputeInvite).then(toHTMLString)
      expect(result).to.equal(
        'fromInviteForm_error--Cannot validate company NAME3 as address is currently in dispute_fromInviteForm'
      )
    })

    it('should return rendered error when company not active', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyInviteForm(mockReq, validCompanyNumberInactiveInvite).then(toHTMLString)
      expect(result).to.equal('fromInviteForm_error--Company NAME4 is not active_fromInviteForm')
    })

    it('should return success form', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyInviteForm(mockReq, validCompanyNumberInvite).then(toHTMLString)
      expect(result).to.equal('fromInviteForm_companyFound-NAME-_fromInviteForm')
    })
  })

  describe('submitNewInvite', () => {
    it('should return rendered error when company not found', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitNewInvite(mockReq, {
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
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitNewInvite(mockReq, {
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
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitNewInvite(mockReq, {
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
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitNewInvite(mockReq, {
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
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitNewInvite(mockReq, {
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
      const { mockTransactionDb, args } = withNewConnectionMocks()

      sinon
        .stub(mockTransactionDb, 'insert')
        .rejects(new Error('details - duplicate key value violates unique constraint "unq_connection_company_number"'))

      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitNewInvite(mockReq, {
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
      const { args, mockEmail } = withNewConnectionMocks()

      sinon.stub(mockEmail, 'sendMail').rejects(new Error())

      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitNewInvite(mockReq, {
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
        const { mockTransactionDb, mockEmail, args } = withNewConnectionMocks()

        insertSpy = sinon.spy(mockTransactionDb, 'insert')
        emailSpy = sinon.spy(mockEmail, 'sendMail')
        clock = sinon.useFakeTimers(100)

        const controller = new NewConnectionController(...args)
        result = await controller
          .submitNewInvite(mockReq, {
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
            pin_attempt_count: 0,
            pin_tries_remaining_count: null,
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
          validity: 'valid',
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

  describe('submitFromInvite', () => {
    it('should rendered error when invite is empty', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitFromInvite(mockReq, { invite: '', action: 'createConnection' })
        .then(toHTMLString)
      expect(result).to.equal('fromInviteForm_error--Invitation is not valid_fromInviteForm')
    })

    it('should rendered error when invite invalid base64', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitFromInvite(mockReq, { invite: invalidBase64Invite, action: 'createConnection' })
        .then(toHTMLString)
      expect(result).to.equal('fromInviteForm_error--Invitation is not valid_fromInviteForm')
    })

    it('should rendered error when invite invalid format', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitFromInvite(mockReq, { invite: invalidInvite, action: 'createConnection' })
        .then(toHTMLString)
      expect(result).to.equal('fromInviteForm_error--Invitation is not valid_fromInviteForm')
    })

    it('should rendered error when company number invalid', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitFromInvite(mockReq, { invite: invalidCompanyNumberInvite, action: 'createConnection' })
        .then(toHTMLString)
      expect(result).to.equal('fromInviteForm_error--Invitation is not valid_fromInviteForm')
    })

    it('should return rendered error when company not found', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitFromInvite(mockReq, { invite: notFoundCompanyNumberInvite, action: 'createConnection' })
        .then(toHTMLString)
      expect(result).to.equal('fromInviteForm_error--Company number does not exist_fromInviteForm')
    })

    it('should return rendered error when company already connected', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitFromInvite(mockReq, { invite: validExistingCompanyNumberInvite, action: 'createConnection' })
        .then(toHTMLString)
      expect(result).to.equal('fromInviteForm_error--Connection already exists with NAME2_fromInviteForm')
    })

    it('should return rendered error when company registered office in dispute', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitFromInvite(mockReq, { invite: validCompanyNumberInDisputeInvite, action: 'createConnection' })
        .then(toHTMLString)
      expect(result).to.equal(
        'fromInviteForm_error--Cannot validate company NAME3 as address is currently in dispute_fromInviteForm'
      )
    })

    it('should return rendered error when company not active', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitFromInvite(mockReq, { invite: validCompanyNumberInactiveInvite, action: 'createConnection' })
        .then(toHTMLString)
      expect(result).to.equal('fromInviteForm_error--Company NAME4 is not active_fromInviteForm')
    })

    it('should return rendered error when unique constraint is violated', async () => {
      const { mockTransactionDb, args } = withNewConnectionMocks()

      sinon
        .stub(mockTransactionDb, 'insert')
        .rejects(new Error('details - duplicate key value violates unique constraint "unq_connection_company_number"'))

      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitFromInvite(mockReq, {
          invite: validCompanyNumberInvite,
          action: 'createConnection',
        })
        .then(toHTMLString)

      expect(result).to.equal('fromInviteForm_error--Connection already exists with NAME_fromInviteForm')
    })

    it('should return success even if email send fails', async () => {
      const { args, mockEmail } = withNewConnectionMocks()

      sinon.stub(mockEmail, 'sendMail').rejects(new Error())

      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitFromInvite(mockReq, {
          invite: validCompanyNumberInvite,
          action: 'createConnection',
        })
        .then(toHTMLString)

      expect(result).to.equal('renderPinForm_42--true_renderPinForm')
    })

    describe('happy path assertions', function () {
      let clock: sinon.SinonFakeTimers
      let insertSpy: sinon.SinonSpy
      let emailSpy: sinon.SinonSpy
      let result: string

      beforeEach(async () => {
        const { mockTransactionDb, mockEmail, args } = withNewConnectionMocks()

        insertSpy = sinon.spy(mockTransactionDb, 'insert')
        emailSpy = sinon.spy(mockEmail, 'sendMail')
        clock = sinon.useFakeTimers(100)

        const controller = new NewConnectionController(...args)
        result = await controller
          .submitFromInvite(mockReq, {
            invite: validCompanyNumberInvite,
            action: 'createConnection',
          })
          .then(toHTMLString)
      })

      afterEach(() => {
        clock.restore()
      })

      it('should return success form', () => {
        expect(result).to.equal('renderPinForm_42--true_renderPinForm')
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
            agent_connection_id: 'oob-connection',
            pin_attempt_count: 0,
            pin_tries_remaining_count: null,
          },
        ])
      })

      it('should insert correct value into connection_invite table', () => {
        expect(insertSpy.secondCall.args[0]).equal('connection_invite')
        const { pin_hash, ...rest } = insertSpy.secondCall.args[1]
        expect(rest).deep.equal({
          connection_id: '42',
          oob_invite_id: 'oob-record',
          expires_at: new Date(100 + 14 * 24 * 60 * 60 * 1000),
          validity: 'valid',
        })
        expect(typeof pin_hash).to.equal('string')
      })

      it('should send two emails', () => {
        expect(emailSpy.callCount).equal(1)
      })

      it('should send email to admin', () => {
        expect(emailSpy.firstCall.args[0]).equal('connection_invite_admin')
        expect(emailSpy.firstCall.args[1]?.address).equal(
          'NAME\r\nADDRESS_LINE_1\r\nADDRESS_LINE_2\r\nCARE_OF\r\nLOCALITY\r\nPO_BOX\r\nPOSTAL_CODE\r\nCOUNTRY\r\nPREMISES\r\nREGION'
        )
        expect(emailSpy.firstCall.args[1]?.pin).match(/[0-9]{6}/)
      })
    })
  })
})
