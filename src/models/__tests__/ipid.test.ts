import { expect } from 'chai'
import { describe, it } from 'mocha'
import { Logger, pino } from 'pino'
import IpidBav from '../ipid.js'
import { CountryCode } from '../stringTypes.js'
import { badValidateResponse, invalidCountryCode, validCountryCode } from './fixtures/ipidFixtures.js'
import { withIpidMock } from './helpers/mockIpid.js'
const mockLogger: Logger = pino({ level: 'silent' })

describe('iPiD API', () => {
  describe('happy path', () => {
    withIpidMock()
    it('should return score and description', async () => {
      const ipid = new IpidBav()
      const result = await ipid.validate(mockLogger, { countryCode: validCountryCode, name: 'Company Name' })
      expect(result).deep.equal({ score: 1, description: 'Strong match' })
    })
  })

  describe('invalid country', () => {
    withIpidMock()
    it('set description to country not supported', async () => {
      const ipid = new IpidBav()
      const result = await ipid.validate(mockLogger, {
        countryCode: invalidCountryCode as CountryCode,
        name: 'Company Name',
      })
      expect(result).deep.equal({ score: 0, description: 'Country not supported' })
    })
  })

  describe('failed to validate', () => {
    withIpidMock(badValidateResponse)
    it('set description to unable to verify', async () => {
      const ipid = new IpidBav()
      const result = await ipid.validate(mockLogger, {
        countryCode: validCountryCode,
        name: 'Company Name',
      })
      expect(result).deep.equal({ score: 0, description: 'Unable to verify' })
    })
  })

  describe('external iPid API down', () => {
    it('set description to unexpected error', async () => {
      // no mock to simulate API down
      const ipid = new IpidBav()
      const result = await ipid.validate(mockLogger, {
        countryCode: validCountryCode,
        name: 'Company Name',
      })
      expect(result).deep.equal({
        score: 0,
        description: 'Unexpected error with Beneficiary Account Validation process',
      })
    })
  })
})
