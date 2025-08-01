import { expect } from 'chai'
import { describe, it } from 'mocha'
import { InternalError } from '../../../errors.js'
import { checkDb } from '../helpers.js'
import { withCheckDbMocks } from './helpers.js'
describe('CheckDb helper function', () => {
  it('should return an error message', async () => {
    const { mockLogger } = withCheckDbMocks()
    const result = checkDb(
      [
        {
          id: 'someId',
          created_at: new Date(),
          company_name: 'SomeName',
          company_number: '111111',
          status: 'pending',
          agent_connection_id: '11110000',
          updated_at: new Date(),
          pin_attempt_count: 0,
          pin_tries_remaining_count: 1,
          registry_country_code: 'GB',
        },
      ],
      2,
      mockLogger
    )
    expect(result).to.deep.equal({
      localPinAttempts: 1,
      message: 'Sorry, your code is invalid. You have 1 attempts left before the PIN expires.',
      nextScreen: 'form',
    })
  })
  it('should return a success message', async () => {
    const { mockLogger } = withCheckDbMocks()
    const result = checkDb(
      [
        {
          id: 'someId',
          created_at: new Date(),
          company_name: 'SomeName',
          company_number: '111111',
          status: 'verified_us',
          agent_connection_id: '11110000',
          updated_at: new Date(),
          pin_attempt_count: 0,
          pin_tries_remaining_count: 4,
          registry_country_code: 'GB',
        },
      ],
      4,
      mockLogger
    )
    expect(result).to.deep.equal({ localPinAttempts: 4, message: 'Success', nextScreen: 'success' })
  })
  it('should return an error message maximum pin entry tries reached', async () => {
    const { mockLogger } = withCheckDbMocks()
    const result = checkDb(
      [
        {
          id: 'someId',
          created_at: new Date(),
          company_name: 'SomeName',
          company_number: '111111',
          status: 'pending',
          agent_connection_id: '11110000',
          updated_at: new Date(),
          pin_attempt_count: 0,
          pin_tries_remaining_count: 0,
          registry_country_code: 'GB',
        },
      ],
      1,
      mockLogger
    )
    expect(result).to.deep.equal({
      localPinAttempts: 0,
      message:
        'Maximum number of pin attempts has been reached, please reach out to the company you are attempting to connect to.',
      nextScreen: 'error',
    })
  })
  it('should return an error message on 1st wrong pin attempt', async () => {
    const { mockLogger } = withCheckDbMocks()
    const result = checkDb(
      [
        {
          id: 'someId',
          created_at: new Date(),
          company_name: 'SomeName',
          company_number: '111111',
          status: 'pending',
          agent_connection_id: '11110000',
          updated_at: new Date(),
          pin_attempt_count: 0,
          pin_tries_remaining_count: 4,
          registry_country_code: 'GB',
        },
      ],
      null,
      mockLogger
    )

    expect(result).to.deep.equal({
      localPinAttempts: 4,
      message: 'Sorry, your code is invalid. You have 4 attempts left before the PIN expires.',
      nextScreen: 'form',
    })
  })
  it('should throw an error if the database becomes inconsistent with our initial value', async () => {
    const { mockLogger } = withCheckDbMocks()
    let err: unknown = null
    try {
      checkDb(
        [
          {
            id: 'someId',
            created_at: new Date(),
            company_name: 'SomeName',
            company_number: '111111',
            status: 'pending',
            agent_connection_id: '11110000',
            updated_at: new Date(),
            pin_attempt_count: 0,
            pin_tries_remaining_count: null,
            registry_country_code: 'GB',
          },
        ],
        2,
        mockLogger
      )
    } catch (error) {
      err = error
    }
    expect(err).to.be.instanceOf(InternalError)
  })
  it('should throw an error if the database becomes inconsistent with our initial value', async () => {
    const { mockLogger } = withCheckDbMocks()
    let err: unknown = null
    try {
      checkDb(
        [
          {
            id: 'someId',
            created_at: new Date(),
            company_name: 'SomeName',
            company_number: '111111',
            status: 'pending',
            agent_connection_id: '11110000',
            updated_at: new Date(),
            pin_attempt_count: 0,
            pin_tries_remaining_count: 6,
            registry_country_code: 'GB',
          },
        ],
        3,
        mockLogger
      )
    } catch (error) {
      err = error
    }
    expect(err).to.be.instanceOf(InternalError)
  })
})
