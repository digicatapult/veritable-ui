import { expect } from 'chai'
import { describe, it } from 'mocha'
import { Env } from '../../env/index.js'
import OrganisationRegistryEntity from '../organisationRegistry.js'
import {
  invalidCompanyNumber,
  noCompanyNumber,
  successResponse,
  validCompanyNumber,
} from './fixtures/companyHouseFixtures.js'
import { withCompanyHouseMock } from './helpers/mockCompanyHouse.js'

describe('organisationRegistryEntity with company house as registry', () => {
  withCompanyHouseMock()

  describe('getOrganisationProfileByOrganisationNumber', () => {
    it('should return company found if valid company', async () => {
      const environment = new Env()
      const organisationRegistryObject = new OrganisationRegistryEntity(environment)
      const response = await organisationRegistryObject.getOrganisationProfileByOrganisationNumber(validCompanyNumber)
      expect(response).deep.equal({ type: 'found', company: successResponse })
    })

    it('should return notFound for 404', async () => {
      const environment = new Env()
      const organisationRegistryObject = new OrganisationRegistryEntity(environment)
      const response = await organisationRegistryObject.getOrganisationProfileByOrganisationNumber(noCompanyNumber)
      expect(response).deep.equal({ type: 'notFound' })
    })

    it('should propagate other errors', async () => {
      const environment = new Env()
      const organisationRegistryObject = new OrganisationRegistryEntity(environment)
      let errorMessage: unknown
      try {
        await organisationRegistryObject.getOrganisationProfileByOrganisationNumber(invalidCompanyNumber)
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
      const organisationRegistryObject = new OrganisationRegistryEntity(environment)
      const response = await organisationRegistryObject.localOrganisationProfile()

      expect(response).deep.equal(successResponse)
    })
  })
})
