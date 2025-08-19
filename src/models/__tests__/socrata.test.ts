import { expect } from 'chai'
import { describe, it } from 'mocha'
import { pino } from 'pino'
import { container } from 'tsyringe'
import { RAW_ENV_TOKEN } from '../../env/common.js'
import { Env } from '../../env/index.js'
import type { ILogger } from '../../logger.js'
import { RegistryType } from '../db/types.js'
import OrganisationRegistry from '../orgRegistry/organisationRegistry.js'
import { CountryCode } from '../stringTypes.js'
import {
  finalSuccessResponse,
  invalidCompanyNumber,
  noCompanyNumber,
  validCompanyNumber,
} from './fixtures/socrataFixtures.js'
import { mockRegistryEnv, socrataAsLocalRegistry } from './helpers/mock.js'
import { withSocrataMock } from './helpers/mockSocrata.js'
const mockLogger: ILogger = pino({ level: 'silent' })
const nyRegistryCountryCode = 'US' as CountryCode
const socrataRegistry = 'socrata' as RegistryType

describe('organisationRegistry with socrata as registry', () => {
  withSocrataMock()
  describe('getOrganisationProfileByOrganisationNumber', () => {
    it('should return company found if valid company', async () => {
      const environment = container.resolve(Env)

      const organisationRegistryObject = new OrganisationRegistry(environment, mockLogger)
      const response = await organisationRegistryObject.getOrganisationProfileByOrganisationNumber({
        companyNumber: validCompanyNumber,
        registryCountryCode: nyRegistryCountryCode,
        selectedRegistry: socrataRegistry,
      })
      expect(response).deep.equal({ type: 'found', company: finalSuccessResponse })
    })
    it('should return notFound if company notFound', async () => {
      const environment = new Env()
      const organisationRegistryObject = new OrganisationRegistry(environment, mockLogger)
      const response = await organisationRegistryObject.getOrganisationProfileByOrganisationNumber({
        companyNumber: noCompanyNumber,
        registryCountryCode: nyRegistryCountryCode,
        selectedRegistry: socrataRegistry,
      })
      expect(response).deep.equal({ type: 'notFound' })
    })
    it('should propagate other errors', async () => {
      const environment = new Env()
      const organisationRegistryObject = new OrganisationRegistry(environment, mockLogger)
      let errorMessage: unknown
      try {
        const res = await organisationRegistryObject.getOrganisationProfileByOrganisationNumber({
          companyNumber: invalidCompanyNumber,
          registryCountryCode: nyRegistryCountryCode,
          selectedRegistry: socrataRegistry,
        })
      } catch (err) {
        errorMessage = err
      }

      expect(errorMessage).instanceOf(Error)
      expect((errorMessage as Error).message).equals(`Error calling Socrata API`)
    })
  })

  describe('localOrganisationProfile', () => {
    withSocrataMock()
    beforeEach(() => {
      container.clearInstances()
      mockRegistryEnv(socrataAsLocalRegistry)
    })
    afterEach(() => {
      container.clearInstances()
    })
    it('should return company found', async () => {
      const environment = container.resolve<Env>(RAW_ENV_TOKEN)

      container.registerInstance<OrganisationRegistry>(
        OrganisationRegistry,
        new OrganisationRegistry(environment, mockLogger)
      )
      const organisationRegistryObject = container.resolve(OrganisationRegistry)
      const response = await organisationRegistryObject.localOrganisationProfile()

      expect(response).deep.equal(finalSuccessResponse)
    })
  })
})
