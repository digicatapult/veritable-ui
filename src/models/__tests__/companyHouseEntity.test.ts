import { describe, it } from 'mocha'
import { Env } from '../../env'
import CompanyHouseEntity from '../companyHouseEntity'
import {
  invalidCompanyNumber,
  noCompanyNumber,
  successResponse,
  validCompanyNumber,
} from './fixtures/companyHouseFixtures'
import { withCompanyHouseMock } from './helpers/mockCompanyHouse'

describe('companyHouseEntity', () => {
  let expect: Chai.ExpectStatic
  before(async () => {
    expect = (await import('chai')).expect
  })

  withCompanyHouseMock()

  describe('getCompanyProfileByCompanyNumber', () => {
    it('should give back a json in format of companyProfileSchema', async () => {
      const environment = new Env()
      const companyHouseObject = new CompanyHouseEntity(environment)
      const response = await companyHouseObject.getCompanyProfileByCompanyNumber(validCompanyNumber)
      expect(response).deep.equal(successResponse)
    })
    it('should give back a empty json', async () => {
      const environment = new Env()
      const companyHouseObject = new CompanyHouseEntity(environment)
      let errorMessage: unknown
      try {
        await companyHouseObject.getCompanyProfileByCompanyNumber(noCompanyNumber)
      } catch (err) {
        errorMessage = err
      }

      expect(errorMessage).instanceOf(Error)
      expect((errorMessage as Error).message).equals(`Error calling CompanyHouse API`)
    })
    it('should throw an error saying Error calling CompanyHouse API', async () => {
      const environment = new Env()
      const companyHouseObject = new CompanyHouseEntity(environment)
      let errorMessage: unknown
      try {
        await companyHouseObject.getCompanyProfileByCompanyNumber(invalidCompanyNumber)
      } catch (err) {
        errorMessage = err
      }

      expect(errorMessage).instanceOf(Error)
      expect((errorMessage as Error).message).equals(`Error calling CompanyHouse API`)
    })
  })
})
