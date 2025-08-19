import { expect } from 'chai'
import { describe, it } from 'mocha'
import { pino } from 'pino'
import { container } from 'tsyringe'
import { RAW_ENV_TOKEN } from '../../env/common.js'
import { Env } from '../../env/index.js'
import type { ILogger } from '../../logger.js'
import { RegistryType } from '../db/types.js'
import OrganisationRegistry from '../orgRegistry/organisationRegistry.js'
import {
  finalSuccessResponse,
  gbCountryCode,
  invalidCompanyNumber,
  noCompanyNumber,
  validCompanyNumber,
} from './fixtures/openCorporatesFixtures.js'
import { mockRegistryEnv, openCorporatesAsLocalRegistry } from './helpers/mock.js'
import { withOpenCorporatesMock } from './helpers/mockOpenCorporates.js'

const mockLogger: ILogger = pino({ level: 'silent' })
const openCorporatesRegistry = 'open_corporates' as RegistryType

// TODO: fix this test suite
describe.skip('organisationRegistry with open corporates as registry', () => {
  withOpenCorporatesMock()
  describe('getOrganisationProfileByOrganisationNumber', () => {
    it('should return company found if valid company', async () => {
      const environment = container.resolve(Env)
      const organisationRegistryObject = new OrganisationRegistry(environment, mockLogger)
      const response = await organisationRegistryObject.getOrganisationProfileByOrganisationNumber({
        companyNumber: validCompanyNumber,
        registryCountryCode: gbCountryCode,
        selectedRegistry: openCorporatesRegistry,
      })
      expect(response).deep.equal({ type: 'found', company: finalSuccessResponse })
    })
    it('should return notFound if company notFound', async () => {
      const environment = new Env()
      const organisationRegistryObject = new OrganisationRegistry(environment, mockLogger)
      const response = await organisationRegistryObject.getOrganisationProfileByOrganisationNumber({
        companyNumber: noCompanyNumber,
        registryCountryCode: gbCountryCode,
        selectedRegistry: openCorporatesRegistry,
      })
      expect(response).deep.equal({ type: 'notFound' })
    })
    it.skip('should propagate other errors', async () => {
      const environment = new Env()
      const organisationRegistryObject = new OrganisationRegistry(environment, mockLogger)
      let errorMessage: unknown
      try {
        const res = await organisationRegistryObject.getOrganisationProfileByOrganisationNumber({
          companyNumber: invalidCompanyNumber,
          registryCountryCode: gbCountryCode,
          selectedRegistry: openCorporatesRegistry,
        })
      } catch (err) {
        errorMessage = err
      }

      expect(errorMessage).instanceOf(Error)
      expect((errorMessage as Error).message).equals(`Error calling CompanyHouse API`)
    })
  })

  describe('localOrganisationProfile', () => {
    withOpenCorporatesMock()
    beforeEach(() => {
      container.clearInstances()
      mockRegistryEnv(openCorporatesAsLocalRegistry)
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
