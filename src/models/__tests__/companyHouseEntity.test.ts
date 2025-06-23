import { expect } from 'chai'
import { describe, it } from 'mocha'
import { Env } from '../../env/index.js'
import CompanyHouseEntity from '../organisationRegistry.js'
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
    it('should return company found if valid company', async () => {
      const environment = new Env()
      const companyHouseObject = new CompanyHouseEntity(environment)
      const response = await companyHouseObject.getCompanyProfileByCompanyNumber(validCompanyNumber)
      expect(response).deep.equal({ type: 'found', company: successResponse })
    })

    it('should return notFound for 404', async () => {
      const environment = new Env()
      const companyHouseObject = new CompanyHouseEntity(environment)
      const response = await companyHouseObject.getCompanyProfileByCompanyNumber(noCompanyNumber)
      expect(response).deep.equal({ type: 'notFound' })
    })

    it('should propagate other errors', async () => {
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

  describe('localCompanyHouseProfile', () => {
    it('should return company found', async () => {
      const environment = new Env()
      const companyHouseObject = new CompanyHouseEntity(environment)
      const response = await companyHouseObject.localCompanyHouseProfile()

      expect(response).deep.equal(successResponse)
    })
  })
})
