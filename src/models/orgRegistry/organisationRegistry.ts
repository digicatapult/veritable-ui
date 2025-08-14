import { inject, injectable, singleton } from 'tsyringe'
import z from 'zod'
import { Env } from '../../env/index.js'
import { InternalError } from '../../errors.js'
import { type ILogger, Logger } from '../../logger.js'
import Database from '../db/index.js'
import { OrganisationRegistriesRow, RegistryType } from '../db/types.js'
import { COMPANY_NUMBER, CountryCode, SOCRATA_NUMBER } from '../stringTypes.js'
import { companyHouseProfileSchema } from './registrySchemas/companyHouseSchema.js'
import { openCorporatesSchema } from './registrySchemas/openCorporatesSchema.js'
import { dosEntitySchema } from './registrySchemas/socrataSchema.js'

export type CompanyHouseProfile = z.infer<typeof companyHouseProfileSchema>
export type SocrataProfile = z.infer<typeof dosEntitySchema>
export type OpenCorporatesProfile = z.infer<typeof openCorporatesSchema>
export type SharedOrganisationInfo = {
  name: string
  address: string
  status: string
  number: string
  registryCountryCode: CountryCode
  selectedRegistry: RegistryType
  registeredOfficeIsInDispute: boolean
}
export type OrganisationRequest = {
  companyNumber: SOCRATA_NUMBER | COMPANY_NUMBER
  registryCountryCode: CountryCode
  selectedRegistry: RegistryType
}
export type OrganisationProfile =
  | {
      company: SharedOrganisationInfo
      type: 'found'
    }
  | { type: 'notFound' }

export type BaseProfileSearchResult<T> =
  | {
      type: 'found'
      company: T
    }
  | {
      type: 'notFound'
    }

@singleton()
@injectable()
export default class OrganisationRegistry {
  private localOrganisationProfilePromise: Promise<SharedOrganisationInfo>

  constructor(
    private env: Env,
    private db: Database,
    @inject(Logger) private logger: ILogger
  ) {
    console.log('setting up local organisation profile')
    this.localOrganisationProfilePromise = this.getOrganisationProfileByOrganisationNumber({
      companyNumber: env.get('INVITATION_FROM_COMPANY_NUMBER'),
      registryCountryCode: env.get('LOCAL_REGISTRY_COUNTRY_CODE'),
      selectedRegistry: env.get('LOCAL_REGISTRY_TO_USE'),
    }).then((result) => {
      if (result.type === 'notFound') {
        throw new InternalError(`Local organisation profile not found`)
      }
      return result.company
    })
    this.logger.info('OrganisationRegistry initialized')
  }

  private async makeCompanyProfileRequest(route: string): Promise<unknown> {
    const url = new URL(route)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: new Headers({
        Authorization: this.env.get('COMPANY_PROFILE_API_KEY'),
      }),
    })

    if (response.ok) {
      return response.json()
    }

    if (response.status === 404) {
      return null
    }

    throw new InternalError(`Error calling CompanyHouse API`)
  }

  private async makeSocrataRequest(route: string): Promise<unknown> {
    const url = new URL(route)

    const response = await fetch(url.toString(), {
      method: 'GET',
    })
    if (response.ok) {
      return response.json()
    }

    if (response.status === 404) {
      return null
    }

    throw new InternalError(`Error calling Socrata API`)
  }

  private async makeOpenCorporatesRequest(route: string): Promise<unknown> {
    const url = new URL(route)
    const response = await fetch(url.toString(), {
      method: 'GET',
    })
    if (response.ok) {
      return response.json()
    }

    if (response.status === 404) {
      return null
    }

    throw new InternalError(`Error calling OpenCorporates API`)
  }

  async getOrganisationProfileByOrganisationNumber(orgReq: OrganisationRequest): Promise<OrganisationProfile> {
    console.log('orgReq', orgReq)
    this.logger.info(`Retrieving organisation profile for ${orgReq.companyNumber} in ${orgReq.registryCountryCode}`)
    const registry = await this.resolveOrganisationRegistry(orgReq.registryCountryCode, orgReq.selectedRegistry)
    if (!registry) {
      throw new InternalError(`Registry for ${orgReq.registryCountryCode} not set`)
    }
    switch (orgReq.selectedRegistry) {
      case 'company_house':
        return this.formatCompanyHouseResults(
          await this.getCompanyHouseProfileByCompanyNumber(orgReq.companyNumber, registry, orgReq.selectedRegistry)
        )
      case 'socrata':
        return this.formatSocrataResults(
          await this.getSocrataProfileByCompanyNumber(orgReq.companyNumber, registry, orgReq.selectedRegistry)
        )

      case 'open_corporates':
        return this.formatOpenCorporatesResults(
          await this.getOpenCorporatesProfileByCompanyNumber(orgReq.companyNumber, registry, orgReq.registryCountryCode)
        )
      default:
        throw new InternalError(`Registry ${registry} not set`)
    }
  }

  /*
    This function will return a companyProfile object
  */
  private async getCompanyHouseProfileByCompanyNumber(
    companyNumber: string,
    registry: OrganisationRegistriesRow,
    selectedRegistry: RegistryType
  ): Promise<BaseProfileSearchResult<CompanyHouseProfile>> {
    this.logger.info(`Getting company house profile for ${companyNumber}`)
    const endpoint = `${registry.url}/company/${encodeURIComponent(companyNumber)}`
    const companyProfile = await this.makeCompanyProfileRequest(endpoint)
    return companyProfile === null
      ? { type: 'notFound' }
      : { type: 'found', company: companyHouseProfileSchema.parse(companyProfile) }
  }

  private async getSocrataProfileByCompanyNumber(
    companyNumber: string,
    registry: OrganisationRegistriesRow,
    selectedRegistry: RegistryType
  ): Promise<BaseProfileSearchResult<SocrataProfile>> {
    this.logger.info(`Getting socrata profile for ${companyNumber}`)
    // NOTE: 3211809 <-- comp no to test socrata with
    const endpoint = `${registry.url}?dos_id=${companyNumber}`
    const companyProfile = await this.makeSocrataRequest(endpoint)
    const parsedCompanyProfile = dosEntitySchema.parse(companyProfile)
    return parsedCompanyProfile.length === 0 || parsedCompanyProfile === null
      ? { type: 'notFound' }
      : { type: 'found', company: parsedCompanyProfile }
  }

  private async getOpenCorporatesProfileByCompanyNumber(
    companyNumber: string,
    registry: OrganisationRegistriesRow,
    registryCountryCode: CountryCode
  ): Promise<BaseProfileSearchResult<OpenCorporatesProfile>> {
    this.logger.info(`Getting open corporates profile for ${companyNumber}`)
    const endpoint = `${registry.url}/companies/${registryCountryCode.toLowerCase()}/${encodeURIComponent(companyNumber)}?api_token=${this.env.get('OPEN_CORPORATES_API_KEY')}`
    console.log('endpoint', endpoint)
    const companyProfile = await this.makeOpenCorporatesRequest(endpoint)
    console.log('companyNumber', companyNumber)
    console.log('companyProfile', companyProfile)
    return companyProfile === null
      ? { type: 'notFound' }
      : { type: 'found', company: openCorporatesSchema.parse(companyProfile) }
  }

  async localOrganisationProfile(): Promise<SharedOrganisationInfo> {
    return await this.localOrganisationProfilePromise
  }

  async formatSocrataResults(socrataResults: BaseProfileSearchResult<SocrataProfile>): Promise<OrganisationProfile> {
    if (socrataResults.type === 'notFound') {
      return socrataResults
    }
    return {
      company: {
        name: socrataResults.company[0].current_entity_name,
        address: [
          socrataResults.company[0].dos_process_address_1,
          socrataResults.company[0].dos_process_city,
          socrataResults.company[0].dos_process_state,
          socrataResults.company[0].dos_process_zip,
        ]
          .filter((x) => !!x)
          .join(', '),
        number: socrataResults.company[0].dos_id,
        status: 'active', // presume active if org is found
        registryCountryCode: 'US' as CountryCode,
        registeredOfficeIsInDispute: false, // presume no if no dispute info
        selectedRegistry: 'socrata',
      },
      type: 'found',
    }
  }
  async formatCompanyHouseResults(
    companyHouseResults: BaseProfileSearchResult<CompanyHouseProfile>
  ): Promise<OrganisationProfile> {
    this.logger.info(`Formatting company house results`)
    if (companyHouseResults.type === 'notFound') {
      return companyHouseResults
    }

    return {
      company: {
        name: companyHouseResults.company.company_name,
        address: [
          companyHouseResults.company.company_name,
          companyHouseResults.company.registered_office_address.address_line_1,
          companyHouseResults.company.registered_office_address.address_line_2,
          companyHouseResults.company.registered_office_address.care_of,
          companyHouseResults.company.registered_office_address.locality,
          companyHouseResults.company.registered_office_address.po_box,
          companyHouseResults.company.registered_office_address.postal_code,
          companyHouseResults.company.registered_office_address.country,
          companyHouseResults.company.registered_office_address.premises,
          companyHouseResults.company.registered_office_address.region,
        ]
          .filter((x) => !!x)
          .join(', '),
        number: companyHouseResults.company.company_number,
        status: companyHouseResults.company.company_status,
        registryCountryCode: 'GB' as CountryCode,
        registeredOfficeIsInDispute: companyHouseResults.company.registered_office_is_in_dispute ?? false,
        selectedRegistry: 'company_house',
      },
      type: 'found',
    }
  }
  async formatOpenCorporatesResults(
    openCorporatesResults: BaseProfileSearchResult<OpenCorporatesProfile>
  ): Promise<OrganisationProfile> {
    if (openCorporatesResults.type === 'notFound') {
      return openCorporatesResults
    }
    const company = openCorporatesResults.company.results.company
    return {
      company: {
        name: company.name,
        address: company.registered_address_in_full,
        number: company.company_number,
        status: company.current_status.toLowerCase(), // TODO: unify the statuses
        registryCountryCode: company.jurisdiction_code.toUpperCase() as CountryCode,
        registeredOfficeIsInDispute: false,
        selectedRegistry: 'open_corporates',
      },
      type: 'found',
    }
  }

  private async resolveOrganisationRegistry(
    registryCountryCode: CountryCode,
    thirdPartyRegistryToUse: RegistryType | null = null
  ) {
    this.logger.info(`Resolving organisation registry for ${registryCountryCode}`)
    if (thirdPartyRegistryToUse !== null) {
      const [registry]: OrganisationRegistriesRow[] = await this.db.get('organisation_registries', {
        country_code: registryCountryCode,
        registry_key: thirdPartyRegistryToUse,
      })
      if (registry) {
        this.logger.info(`Resolved organisation registry for ${registryCountryCode} to ${registry.registry_name}`)
        return registry
      }
      this.logger.info(`${thirdPartyRegistryToUse} registry is not configured for ${registryCountryCode}`)
      return null
    }

    const [registry]: OrganisationRegistriesRow[] = await this.db.get('organisation_registries', {
      country_code: registryCountryCode,
    })
    if (registry) {
      this.logger.info(`Resolved organisation registry for ${registryCountryCode} to ${registry.registry_name}`)
      return registry
    }
    this.logger.info(`No organisation registry found for ${registryCountryCode}`)
    return null
  }
}
