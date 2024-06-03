import { describe, it } from 'mocha'

import { Env } from '../../env.js'
import { invalidResponse, successResponseTransformed } from './fixtures/cloudagentFixtures.js'
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
      withCloudagentMock()

      it('should give back out-of-band invite', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment)
        const response = await cloudagent.createOutOfBandInvite({ companyName: 'Digital Catapult' })
        expect(response).deep.equal(successResponseTransformed)
      })
    })

    describe('error (response code)', function () {
      withCloudagentMock(400, {})

      it('should throw internal error', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment)

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
      withCloudagentMock(200, invalidResponse)

      it('should throw internal error', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment)

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
})
