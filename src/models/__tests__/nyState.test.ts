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
} from './fixtures/nyStateFixtures.js'
import { mockRegistryEnv, nyStateAsLocalRegistry } from './helpers/mock.js'
import { withNYStateMock } from './helpers/mockNYState.js'
const mockLogger: ILogger = pino({ level: 'silent' })
const nyRegistryCountryCode = 'US' as CountryCode
const nyStateRegistry = 'ny_state' as RegistryType

describe('organisationRegistry with NY state registry', () => {
  withNYStateMock()
  describe('getOrganisationProfileByOrganisationNumber', () => {
    it('should return company found if valid company', async () => {
      const environment = container.resolve(Env)

      const organisationRegistryObject = new OrganisationRegistry(environment, mockLogger)
      const response = await organisationRegistryObject.getOrganisationProfileByOrganisationNumber({
        companyNumber: validCompanyNumber,
        registryCountryCode: nyRegistryCountryCode,
        selectedRegistry: nyStateRegistry,
      })
      expect(response).deep.equal({ type: 'found', company: finalSuccessResponse })
    })
    it('should return notFound if company notFound', async () => {
      const environment = new Env()
      const organisationRegistryObject = new OrganisationRegistry(environment, mockLogger)
      const response = await organisationRegistryObject.getOrganisationProfileByOrganisationNumber({
        companyNumber: noCompanyNumber,
        registryCountryCode: nyRegistryCountryCode,
        selectedRegistry: nyStateRegistry,
      })
      expect(response).deep.equal({ type: 'notFound' })
    })
    it('should propagate other errors', async () => {
      const environment = new Env()
      const organisationRegistryObject = new OrganisationRegistry(environment, mockLogger)
      let errorMessage: unknown
      try {
        await organisationRegistryObject.getOrganisationProfileByOrganisationNumber({
          companyNumber: invalidCompanyNumber,
          registryCountryCode: nyRegistryCountryCode,
          selectedRegistry: nyStateRegistry,
        })
      } catch (err) {
        errorMessage = err
      }

      expect(errorMessage).instanceOf(Error)
      expect((errorMessage as Error).message).equals(`Error calling New York State API`)
    })
  })

  describe('localOrganisationProfile', () => {
    withNYStateMock()
    beforeEach(() => {
      container.clearInstances()
      mockRegistryEnv(nyStateAsLocalRegistry)
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
