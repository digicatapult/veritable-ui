import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'

import { toHTMLString, withNewConnectionMocks } from './helpers.js'

import { Request } from 'express'
import { RegistryType } from '../../../models/db/types.js'
import { CountryCode } from '../../../models/stringTypes.js'
import { mockLogger } from '../../__tests__/helpers.js'
import { NewConnectionController } from '../newConnection.js'
import {
  invalidBase64Invite,
  invalidCompanyNumber,
  invalidCompanyNumberInvite,
  invalidInvite,
  noExistingInviteCompanyNumber,
  notFoundCompanyNumber,
  notFoundCompanyNumberInvite,
  tooManyDisconnectedCompanyNumber,
  usedPendingCompanyNumber,
  usedUnverifiedCompanyNumber,
  usedVerifiedThemCompanyNumber,
  usedVerifiedUsCompanyNumber,
  validCompanyNumber,
  validCompanyNumberInactive,
  validCompanyNumberInactiveInvite,
  validCompanyNumberInDispute,
  validCompanyNumberInDisputeInvite,
  validCompanyNumberInvite,
  validDisconnectedCompanyNumber,
  validPendingCompanyNumber,
  verifiedBothCompanyNumber,
} from './fixtures.js'
const gbRegistryCountryCode = 'GB' as CountryCode

describe('NewConnectionController', () => {
  const req = { log: mockLogger } as unknown as Request

  afterEach(() => {
    sinon.restore()
  })

  describe('newConnectionForm', () => {
    it('should return rendered form template (fromInvite = false)', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.newConnectionForm(req).then(toHTMLString)
      expect(result).to.equal('newInvitePage_message_newInvitePage')
    })

    it('should return rendered form template (fromInvite = true)', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.newConnectionForm(req, true).then(toHTMLString)
      expect(result).to.equal('fromInvitePage_message_fromInvitePage')
    })
  })

  describe('verifyCompanyForm', () => {
    it('should return form page when company number invalid', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .verifyCompanyForm(req, gbRegistryCountryCode, 'company_house', invalidCompanyNumber)
        .then(toHTMLString)
      expect(result).to.equal('newInvitePage_message_newInvitePage')
    })

    it('should return rendered error when company not found', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)

      const result = await controller
        .verifyCompanyForm(req, gbRegistryCountryCode, 'company_house', notFoundCompanyNumber)
        .then(toHTMLString)
      expect(result).to.equal('companyFormInput_error--Company number does not exist-form--00000000_companyFormInput')
    })

    it('should return rendered error when company registered office in dispute', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .verifyCompanyForm(req, gbRegistryCountryCode, 'company_house', validCompanyNumberInDispute)
        .then(toHTMLString)
      expect(result).to.equal(
        'companyFormInput_error--Cannot validate company NAME3 as address is currently in dispute-form--00000003_companyFormInput'
      )
    })

    it('should return rendered error when company not active', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .verifyCompanyForm(req, gbRegistryCountryCode, 'company_house', validCompanyNumberInactive)
        .then(toHTMLString)
      expect(result).to.equal('companyFormInput_error--Company NAME4 is not active-form--00000004_companyFormInput')
    })

    it('should return success form', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .verifyCompanyForm(req, gbRegistryCountryCode, 'company_house', validCompanyNumber)
        .then(toHTMLString)
      expect(result).to.equal('companyFormInput_companyFound-NAME--form--00000001_companyFormInput')
    })
  })

  describe('verifyInviteForm', () => {
    it('should rendered page when invite is empty', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyInviteForm(req, '').then(toHTMLString)
      expect(result).to.equal('fromInvitePage_message_fromInvitePage')
    })

    it('should rendered error when invite invalid base64', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyInviteForm(req, invalidBase64Invite).then(toHTMLString)
      expect(result).to.equal('fromInviteForm_error--Invitation is not valid_fromInviteForm')
    })

    it('should rendered error when invite invalid format', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyInviteForm(req, invalidInvite).then(toHTMLString)
      expect(result).to.equal(
        'fromInviteForm_error--Invitation is not valid, the invite is not in the correct format_fromInviteForm'
      )
    })

    it('should rendered error when company number invalid', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyInviteForm(req, invalidCompanyNumberInvite).then(toHTMLString)
      expect(result).to.equal('fromInviteForm_error--Invitation is not valid_fromInviteForm')
    })

    it('should return rendered error when company not found', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyInviteForm(req, notFoundCompanyNumberInvite).then(toHTMLString)
      expect(result).to.equal('fromInviteForm_error--Company number does not exist_fromInviteForm')
    })

    it('should return rendered error when company registered office in dispute', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyInviteForm(req, validCompanyNumberInDisputeInvite).then(toHTMLString)
      expect(result).to.equal(
        'fromInviteForm_error--Cannot validate company NAME3 as address is currently in dispute_fromInviteForm'
      )
    })

    it('should return rendered error when company not active', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyInviteForm(req, validCompanyNumberInactiveInvite).then(toHTMLString)
      expect(result).to.equal('fromInviteForm_error--Company NAME4 is not active_fromInviteForm')
    })

    it('should return success form', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller.verifyInviteForm(req, validCompanyNumberInvite).then(toHTMLString)
      expect(result).to.equal('fromInviteForm_companyFound-NAME-_fromInviteForm')
    })
  })

  describe('submitNewInvite', () => {
    it('should return rendered error when company not found', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitNewInvite(req, {
          companyNumber: notFoundCompanyNumber,
          email: 'alice@example.com',
          action: 'continue',
          registryCountryCode: gbRegistryCountryCode,
          selectedRegistry: 'company_house' as RegistryType,
        })
        .then(toHTMLString)
      expect(result).to.equal(
        'companyFormInput_error--Company number does not exist-form-alice@example.com-00000000_companyFormInput'
      )
    })

    it('should return rendered error when company registered office in dispute', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitNewInvite(req, {
          companyNumber: validCompanyNumberInDispute,
          email: 'alice@example.com',
          action: 'continue',
          registryCountryCode: gbRegistryCountryCode,
          selectedRegistry: 'company_house' as RegistryType,
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
        .submitNewInvite(req, {
          companyNumber: validCompanyNumberInactive,
          email: 'alice@example.com',
          action: 'continue',
          registryCountryCode: gbRegistryCountryCode,
          selectedRegistry: 'company_house' as RegistryType,
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
        .submitNewInvite(req, {
          companyNumber: validCompanyNumber,
          email: 'alice@example.com',
          action: 'continue',
          registryCountryCode: gbRegistryCountryCode,
          selectedRegistry: 'company_house' as RegistryType,
        })
        .then(toHTMLString)
      expect(result).to.equal(
        'companyFormInput_companyFound-NAME--confirmation-alice@example.com-00000001_companyFormInput'
      )
    })

    it('should return rendered error when unique constraint is violated', async () => {
      const { mockWithTransaction, args } = withNewConnectionMocks()

      sinon
        .stub(mockWithTransaction, 'insert')
        .rejects(new Error('details - duplicate key value violates unique constraint "unq_connection_company_number"'))

      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitNewInvite(req, {
          companyNumber: validCompanyNumber,
          email: 'alice@example.com',
          action: 'submit',
          registryCountryCode: gbRegistryCountryCode,
          selectedRegistry: 'company_house' as RegistryType,
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
        .submitNewInvite(req, {
          companyNumber: validCompanyNumber,
          email: 'alice@example.com',
          action: 'submit',
          registryCountryCode: gbRegistryCountryCode,
          selectedRegistry: 'company_house' as RegistryType,
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
        const { mockWithTransaction, mockEmail, args } = withNewConnectionMocks()

        insertSpy = sinon.spy(mockWithTransaction, 'insert')
        emailSpy = sinon.spy(mockEmail, 'sendMail')
        clock = sinon.useFakeTimers(100)

        const controller = new NewConnectionController(...args)
        const stream = await controller.submitNewInvite(req, {
          companyNumber: validCompanyNumber,
          email: 'alice@example.com',
          action: 'submit',
          registryCountryCode: gbRegistryCountryCode,
          selectedRegistry: 'company_house' as RegistryType,
        })

        clock.restore()
        result = await toHTMLString(stream)
      })

      afterEach(() => {
        clock.restore()
      })

      it('should return success form', () => {
        expect(result).to.equal(
          'companyFormInput_companyFound-NAME--success-alice@example.com-00000001_companyFormInput'
        )
      })

      it('should insert two rows', () => {
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
            registry_country_code: 'GB',
            registry_code: 'company_house',
            address: 'ADDRESS_LINE_1, ADDRESS_LINE_2, COUNTRY, LOCALITY, PO_BOX, POSTAL_CODE, REGION',
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
        const expectedInvite = { companyNumber: '07964699', goalCode: 'GB', inviteUrl: 'url-NAME' }
        const expectedInviteBase64 = Buffer.from(JSON.stringify(expectedInvite), 'utf8').toString('base64url')
        expect(emailSpy.firstCall.args).deep.equal([
          'connection_invite',
          {
            to: 'alice@example.com',
            invite: expectedInviteBase64,
            fromCompanyName: 'COMPANY_NAME',
            toCompanyName: 'NAME',
          },
        ])
      })

      it('should send second email to admin', () => {
        expect(emailSpy.firstCall.args[0]).equal('connection_invite')
        expect(emailSpy.secondCall.args[0]).equal('connection_invite_admin')
        expect(emailSpy.firstCall.args[1]).to.deep.contain({
          to: 'alice@example.com',
          toCompanyName: 'NAME',
          fromCompanyName: 'COMPANY_NAME',
        })
        expect(emailSpy.secondCall.args[2]?.pin).match(/[0-9]{6}/)
        expect(emailSpy.secondCall.args[2]).to.deep.contain({
          receiver: 'NAME',
        })
      })
    })

    describe('sending a second invitation', function () {
      it('should return rendered error when a connection table entry has no invitations in the connection_invites db table', async () => {
        const { args } = withNewConnectionMocks()
        const controller = new NewConnectionController(...args)
        const result = await controller
          .submitNewInvite(req, {
            companyNumber: noExistingInviteCompanyNumber,
            email: 'alice@example.com',
            action: 'continue',
            registryCountryCode: gbRegistryCountryCode,
            selectedRegistry: 'company_house' as RegistryType,
          })
          .then(toHTMLString)
        expect(result).to.equal(
          'companyFormInput_error--No invitation found for connection record undefined-form-alice@example.com-00000011_companyFormInput'
        )
      })

      it('should return rendered error when company already connected and verified_both', async () => {
        const { args } = withNewConnectionMocks()
        const controller = new NewConnectionController(...args)
        const result = await controller
          .submitNewInvite(req, {
            companyNumber: verifiedBothCompanyNumber,
            email: 'alice@example.com',
            action: 'continue',
            registryCountryCode: gbRegistryCountryCode,
            selectedRegistry: 'company_house' as RegistryType,
          })
          .then(toHTMLString)
        expect(result).to.equal(
          'companyFormInput_error--Verified connection already exists with organisation VERIFIED_BOTH-form-alice@example.com-00000010_companyFormInput'
        )
      })

      it('should return rendered error for edge case when invite used but connection pending', async () => {
        const { args } = withNewConnectionMocks()
        const controller = new NewConnectionController(...args)
        const result = await controller
          .submitNewInvite(req, {
            companyNumber: usedPendingCompanyNumber,
            email: 'alice@example.com',
            action: 'continue',
            registryCountryCode: gbRegistryCountryCode,
            selectedRegistry: 'company_house' as RegistryType,
          })
          .then(toHTMLString)
        expect(result).to.equal(
          'companyFormInput_error--Edge case database state detected for connection dddd, aborting-form-alice@example.com-00000012_companyFormInput'
        )
      })

      it('should return rendered error of edge case when invite too_many_attempts and disconnected', async () => {
        const { args } = withNewConnectionMocks()
        const controller = new NewConnectionController(...args)
        const result = await controller
          .submitNewInvite(req, {
            companyNumber: tooManyDisconnectedCompanyNumber,
            email: 'alice@example.com',
            action: 'continue',
            registryCountryCode: gbRegistryCountryCode,
            selectedRegistry: 'company_house' as RegistryType,
          })
          .then(toHTMLString)
        expect(result).to.equal(
          'companyFormInput_error--Edge case database state detected for connection cccc, aborting-form-alice@example.com-00000013_companyFormInput'
        )
      })

      it('should return rendered error of edge case when invite valid and disconnected', async () => {
        const { args } = withNewConnectionMocks()
        const controller = new NewConnectionController(...args)
        const result = await controller
          .submitNewInvite(req, {
            companyNumber: validDisconnectedCompanyNumber,
            email: 'alice@example.com',
            action: 'continue',
            registryCountryCode: gbRegistryCountryCode,
            selectedRegistry: 'company_house' as RegistryType,
          })
          .then(toHTMLString)
        expect(result).to.equal(
          'companyFormInput_error--Edge case database state detected for connection aaaa, aborting-form-alice@example.com-00000014_companyFormInput'
        )
      })

      it('should say to request new pin when invite used and verified_them', async () => {
        const { args } = withNewConnectionMocks()
        const controller = new NewConnectionController(...args)
        const result = await controller
          .submitNewInvite(req, {
            companyNumber: usedVerifiedThemCompanyNumber,
            email: 'alice@example.com',
            action: 'continue',
            registryCountryCode: gbRegistryCountryCode,
            selectedRegistry: 'company_house' as RegistryType,
          })
          .then(toHTMLString)
        expect(result).to.equal(
          'companyFormInput_error--Other party has already verified, request new pin instead from USED_VER_THEM-form-alice@example.com-00000015_companyFormInput'
        )
      })

      it('should say to request new pin when invite used and verified_them', async () => {
        const { args } = withNewConnectionMocks()
        const controller = new NewConnectionController(...args)
        const result = await controller
          .submitNewInvite(req, {
            companyNumber: usedVerifiedThemCompanyNumber,
            email: 'alice@example.com',
            action: 'continue',
            registryCountryCode: gbRegistryCountryCode,
            selectedRegistry: 'company_house' as RegistryType,
          })
          .then(toHTMLString)
        expect(result).to.equal(
          'companyFormInput_error--Other party has already verified, request new pin instead from USED_VER_THEM-form-alice@example.com-00000015_companyFormInput'
        )
      })

      describe('happy path resending invitation', function () {
        it('should allow resubmission with a previous valid invitation and pending connection', async () => {
          const { args } = withNewConnectionMocks()
          const controller = new NewConnectionController(...args)
          const result = await controller
            .submitNewInvite(req, {
              companyNumber: validPendingCompanyNumber,
              email: 'alice@example.com',
              action: 'continue',
              registryCountryCode: gbRegistryCountryCode,
              selectedRegistry: 'company_house' as RegistryType,
            })
            .then(toHTMLString)
          expect(result).to.equal(
            'companyFormInput_companyFound-ALLOW_NEW--confirmation-alice@example.com-00000019_companyFormInput'
          )
        })

        it('should allow resubmission with a previous used invitation but unverified connection', async () => {
          const { args } = withNewConnectionMocks()
          const controller = new NewConnectionController(...args)
          const result = await controller
            .submitNewInvite(req, {
              companyNumber: usedUnverifiedCompanyNumber,
              email: 'alice@example.com',
              action: 'continue',
              registryCountryCode: gbRegistryCountryCode,
              selectedRegistry: 'company_house' as RegistryType,
            })
            .then(toHTMLString)
          expect(result).to.equal(
            'companyFormInput_companyFound-USED_UNVERIFIED--confirmation-alice@example.com-00000016_companyFormInput'
          )
        })

        it('should allow resubmission with a previous used invitation and verified_us', async () => {
          const { args } = withNewConnectionMocks()
          const controller = new NewConnectionController(...args)
          const result = await controller
            .submitNewInvite(req, {
              companyNumber: usedVerifiedUsCompanyNumber,
              email: 'alice@example.com',
              action: 'continue',
              registryCountryCode: gbRegistryCountryCode,
              selectedRegistry: 'company_house' as RegistryType,
            })
            .then(toHTMLString)
          expect(result).to.equal(
            'companyFormInput_companyFound-USED_VER_US--confirmation-alice@example.com-00000017_companyFormInput'
          )
        })
      })
    })
  })

  describe('submitFromInvite', () => {
    it('should rendered error when invite is empty', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitFromInvite(req, { invite: '', action: 'createConnection' })
        .then(toHTMLString)
      expect(result).to.equal(
        'fromInviteForm_error--Invitation is not valid, the invite is not in the correct format_fromInviteForm'
      )
    })

    it('should rendered error when invite invalid base64', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitFromInvite(req, { invite: invalidBase64Invite, action: 'createConnection' })
        .then(toHTMLString)
      expect(result).to.equal('fromInviteForm_error--Invitation is not valid_fromInviteForm')
    })

    it('should rendered error when invite invalid format', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitFromInvite(req, { invite: invalidInvite, action: 'createConnection' })
        .then(toHTMLString)
      expect(result).to.equal(
        'fromInviteForm_error--Invitation is not valid, the invite is not in the correct format_fromInviteForm'
      )
    })

    it('should rendered error when company number invalid', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitFromInvite(req, { invite: invalidCompanyNumberInvite, action: 'createConnection' })
        .then(toHTMLString)
      expect(result).to.equal('fromInviteForm_error--Invitation is not valid_fromInviteForm')
    })

    it('should return rendered error when company not found', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitFromInvite(req, { invite: notFoundCompanyNumberInvite, action: 'createConnection' })
        .then(toHTMLString)
      expect(result).to.equal('fromInviteForm_error--Company number does not exist_fromInviteForm')
    })

    it('should return rendered error when company registered office in dispute', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitFromInvite(req, { invite: validCompanyNumberInDisputeInvite, action: 'createConnection' })
        .then(toHTMLString)
      expect(result).to.equal(
        'fromInviteForm_error--Cannot validate company NAME3 as address is currently in dispute_fromInviteForm'
      )
    })

    it('should return rendered error when company not active', async () => {
      const { args } = withNewConnectionMocks()
      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitFromInvite(req, { invite: validCompanyNumberInactiveInvite, action: 'createConnection' })
        .then(toHTMLString)
      expect(result).to.equal('fromInviteForm_error--Company NAME4 is not active_fromInviteForm')
    })

    it('should return rendered error when unique constraint is violated', async () => {
      const { mockWithTransaction, args } = withNewConnectionMocks()

      sinon
        .stub(mockWithTransaction, 'insert')
        .rejects(new Error('details - duplicate key value violates unique constraint "unq_connection_company_number"'))

      const controller = new NewConnectionController(...args)
      const result = await controller
        .submitFromInvite(req, {
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
        .submitFromInvite(req, {
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
        const { mockWithTransaction, mockEmail, args } = withNewConnectionMocks()

        insertSpy = sinon.spy(mockWithTransaction, 'insert')
        emailSpy = sinon.spy(mockEmail, 'sendMail')
        clock = sinon.useFakeTimers(100)

        const controller = new NewConnectionController(...args)
        const stream = await controller.submitFromInvite(req, {
          invite: validCompanyNumberInvite,
          action: 'createConnection',
        })

        clock.restore()
        result = await toHTMLString(stream)
      })

      afterEach(() => {
        clock.restore()
      })

      it('should return success form', () => {
        expect(result).to.equal('renderPinForm_42--true_renderPinForm')
      })

      it('should insert two rows', () => {
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
            registry_country_code: 'GB',
            registry_code: 'company_house',
            address: 'ADDRESS_LINE_1, ADDRESS_LINE_2, COUNTRY, LOCALITY, PO_BOX, POSTAL_CODE, REGION',
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
        expect(emailSpy.firstCall.args[2]?.pin).match(/[0-9]{6}/)
        expect(emailSpy.firstCall.args[2]).to.deep.contain({
          receiver: 'NAME',
          address: 'ADDRESS_LINE_1, ADDRESS_LINE_2, COUNTRY, LOCALITY, PO_BOX, POSTAL_CODE, REGION',
        })
      })
    })
  })
})
