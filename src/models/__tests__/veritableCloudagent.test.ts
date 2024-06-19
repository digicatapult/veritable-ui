import { describe, it } from 'mocha'

import { Env } from '../../env.js'
import {
  createInviteSuccessResponse,
  invalidResponse,
  mockLogger,
  receiveInviteSuccessResponse,
} from './fixtures/cloudagentFixtures.js'
import { withCloudagentMock } from './helpers/mockCloudagent.js'

import { InternalError } from '../../errors.js'
import VeritableCloudagent from '../veritableCloudagent.js'

describe('veritableCloudagent', () => {
  let expect: Chai.ExpectStatic
  before(async () => {
    expect = (await import('chai')).expect
  })

  describe('createOutOfBandInvite', () => {
    describe('success', function () {
      withCloudagentMock(`/v1/oob/create-invitation`, 200, createInviteSuccessResponse)

      it('should give back out-of-band invite', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)
        const response = await cloudagent.createOutOfBandInvite({ companyName: 'Digital Catapult' })
        expect(response).deep.equal(createInviteSuccessResponse)
      })
    })

    describe('error (response code)', function () {
      withCloudagentMock(`/v1/oob/create-invitation`, 400, {})

      it('should throw internal error', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)

        let error: unknown = null
        try {
          await cloudagent.createOutOfBandInvite({ companyName: 'Digital Catapult' })
        } catch (err) {
          error = err
        }
        expect(error).instanceOf(InternalError)
      })
    })

    describe('error (response invalid)', function () {
      withCloudagentMock(`/v1/oob/create-invitation`, 200, invalidResponse)

      it('should throw internal error', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)

        let error: unknown = null
        try {
          await cloudagent.createOutOfBandInvite({ companyName: 'Digital Catapult' })
        } catch (err) {
          error = err
        }
        expect(error).instanceOf(InternalError)
      })
    })
  })

  describe('receiveOutOfBandInvite', () => {
    describe('success', function () {
      withCloudagentMock('/v1/oob/receive-invitation-url', 200, receiveInviteSuccessResponse)

      it('should give back out-of-band invite', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)
        const response = await cloudagent.receiveOutOfBandInvite({
          companyName: 'Digital Catapult',
          invitationUrl: 'http://example.com',
        })
        expect(response).deep.equal(receiveInviteSuccessResponse)
      })
    })

    describe('error (response code)', function () {
      withCloudagentMock('/v1/oob/receive-invitation-url', 400, {})

      it('should throw internal error', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)

        let error: unknown = null
        try {
          await cloudagent.receiveOutOfBandInvite({
            companyName: 'Digital Catapult',
            invitationUrl: 'http://example.com',
          })
        } catch (err) {
          error = err
        }
        expect(error).instanceOf(InternalError)
      })
    })

    describe('error (response invalid)', function () {
      withCloudagentMock('/v1/oob/receive-invitation-url', 200, invalidResponse)

      it('should throw internal error', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)

        let error: unknown = null
        try {
          await cloudagent.receiveOutOfBandInvite({
            companyName: 'Digital Catapult',
            invitationUrl: 'http://example.com',
          })
        } catch (err) {
          error = err
        }
        expect(error).instanceOf(InternalError)
      })
    })
  })
})
