import { expect } from 'chai'
import { describe, it } from 'mocha'
import { pino } from 'pino'
import { container } from 'tsyringe'
import { Env } from '../../env/index.js'
import type { ILogger } from '../../logger.js'
import OrganisationRegistry from '../orgRegistry/organisationRegistry.js'
import { CountryCode } from '../strings.js'
import {
  finalSuccessResponse,
  invalidCompanyNumber,
  noCompanyNumber,
  validCompanyNumber,
} from './fixtures/companyHouseFixtures.js'
import { mockDb } from './helpers/dbMock.js'
import { withCompanyHouseMock } from './helpers/mockCompanyHouse.js'

const mockLogger: ILogger = pino({ level: 'silent' })
const ukRegistryCountryCode = 'GB' as CountryCode

describe('organisationRegistry with company house as registry', () => {
  withCompanyHouseMock()

  describe('getOrganisationProfileByOrganisationNumber', () => {
    it('should return company found if valid company', async () => {
      const environment = container.resolve(Env)
      const organisationRegistryObject = new OrganisationRegistry(environment, mockDb, mockLogger)
      const response = await organisationRegistryObject.getOrganisationProfileByOrganisationNumber(
        validCompanyNumber,
        ukRegistryCountryCode
      )
      expect(response).deep.equal({ type: 'found', company: finalSuccessResponse })
    })

    it('should return notFound for 404', async () => {
      const environment = new Env()
      const organisationRegistryObject = new OrganisationRegistry(environment, mockDb, mockLogger)
      const response = await organisationRegistryObject.getOrganisationProfileByOrganisationNumber(
        noCompanyNumber,
        ukRegistryCountryCode
      )
      expect(response).deep.equal({ type: 'notFound' })
    })

    it('should propagate other errors', async () => {
      const environment = new Env()
      const organisationRegistryObject = new OrganisationRegistry(environment, mockDb, mockLogger)
      let errorMessage: unknown
      try {
        await organisationRegistryObject.getOrganisationProfileByOrganisationNumber(
          invalidCompanyNumber,
          ukRegistryCountryCode
        )
      } catch (err) {
        errorMessage = err
      }

      expect(errorMessage).instanceOf(Error)
      expect((errorMessage as Error).message).equals(`Error calling CompanyHouse API`)
    })
  })

  describe('localOrganisationProfile', () => {
    it('should return company found', async () => {
      const environment = new Env()
      const organisationRegistryObject = new OrganisationRegistry(environment, mockDb, mockLogger)
      const response = await organisationRegistryObject.localOrganisationProfile()

      expect(response).deep.equal(finalSuccessResponse)
    })
  })
})
