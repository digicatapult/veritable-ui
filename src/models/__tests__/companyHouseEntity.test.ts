import { expect } from 'chai'
import { describe, it } from 'mocha'
import { Env } from '../../env.js'
import CompanyHouseEntity from '../companyHouseEntity.js'
import {
  invalidCompanyNumber,
  noCompanyNumber,
  successResponse,
  validCompanyNumber,
} from './fixtures/companyHouseFixtures.js'
import { withCompanyHouseMock } from './helpers/mockCompanyHouse.js'

describe('companyHouseEntity', () => {
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
