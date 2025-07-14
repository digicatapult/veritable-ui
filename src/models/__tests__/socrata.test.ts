import { expect } from 'chai'
import { describe, it } from 'mocha'
import { pino } from 'pino'
import { container } from 'tsyringe'
import { RegistryCountryCode } from '../../controllers/connection/strings.js'
import { Env } from '../../env/index.js'
import type { ILogger } from '../../logger.js'
import OrganisationRegistry from '../orgRegistry/organisationRegistry.js'
import {
  finalSuccessResponse,
  invalidCompanyNumber,
  noCompanyNumber,
  validCompanyNumber,
} from './fixtures/socrataFixtures.js'
import { mockDb } from './helpers/dbMock.js'
import { withSocrataMock } from './helpers/mockSocrata.js'
const mockLogger: ILogger = pino({ level: 'silent' })
const nyRegistryCountryCode = RegistryCountryCode.NY

describe('organisationRegistry with socrata as registry', () => {
  withSocrataMock()
  describe('getOrganisationProfileByOrganisationNumber', () => {
    it('should return company found if valid company', async () => {
      const environment = container.resolve(Env)

      const organisationRegistryObject = new OrganisationRegistry(environment, mockDb, mockLogger)
      const response = await organisationRegistryObject.getOrganisationProfileByOrganisationNumber(
        validCompanyNumber,
        nyRegistryCountryCode
      )
      expect(response).deep.equal({ type: 'found', company: finalSuccessResponse })
    })
    it('should return notFound if company notFound', async () => {
      const environment = new Env()
      const organisationRegistryObject = new OrganisationRegistry(environment, mockDb, mockLogger)
      const response = await organisationRegistryObject.getOrganisationProfileByOrganisationNumber(
        noCompanyNumber,
        nyRegistryCountryCode
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
          nyRegistryCountryCode
        )
      } catch (err) {
        errorMessage = err
      }

      expect(errorMessage).instanceOf(Error)
      expect((errorMessage as Error).message).equals(`Error calling Socrata API`)
    })
  })
  // TODO:
  // Add tests for localOrganisationProfile
  // for Socrata being used as local registry
  // this may entail rewriting the env
})
