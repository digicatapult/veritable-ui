import { inject, injectable, singleton } from 'tsyringe'
import z from 'zod'
import { Env } from '../../env/index.js'
import { InternalError } from '../../errors.js'
import { type ILogger, Logger } from '../../logger.js'
import Database from '../db/index.js'
import { OrganisationRegistriesRow } from '../db/types.js'
import { CountryCode } from '../strings.js'
import { companyHouseProfileSchema } from './registrySchemas/companyHouseSchema.js'
import { dosEntitySchema } from './registrySchemas/socrataSchema.js'

export type CompanyHouseProfile = z.infer<typeof companyHouseProfileSchema>
export type SocrataProfile = z.infer<typeof dosEntitySchema>
export type SharedOrganisationInfo = {
  name: string
  address: string
  status: string
  number: string
  registryCountryCode: CountryCode
  registeredOfficeIsInDispute: boolean
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
    this.localOrganisationProfilePromise = this.getOrganisationProfileByOrganisationNumber(
      env.get('INVITATION_FROM_COMPANY_NUMBER'),
      env.get('LOCAL_REGISTRY_TO_USE')
    ).then((result) => {
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

  async getOrganisationProfileByOrganisationNumber(
    companyNumber: string,
    registryCountryCode: CountryCode
  ): Promise<OrganisationProfile> {
    this.logger.info(`Retrieving organisation profile for ${companyNumber} in ${registryCountryCode}`)
    const registry = await this.resolveOrganisationRegistry(registryCountryCode)
    if (!registry) {
      throw new InternalError(`Registry for ${registryCountryCode} not set`)
    }
    switch (registryCountryCode) {
      case 'GB':
        return this.formatCompanyHouseResults(await this.getCompanyHouseProfileByCompanyNumber(companyNumber, registry))
      case 'US':
        return this.formatSocrataResults(await this.getSocrataProfileByCompanyNumber(companyNumber, registry))
      default:
        throw new InternalError(`Registry ${registry} not set`)
    }
  }

  /*
    This function will return a companyProfile object
  */
  private async getCompanyHouseProfileByCompanyNumber(
    companyNumber: string,
    registry: OrganisationRegistriesRow
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
    registry: OrganisationRegistriesRow
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
      },
      type: 'found',
    }
  }

  private async resolveOrganisationRegistry(registryCountryCode: string) {
    this.logger.info(`Resolving organisation registry for ${registryCountryCode}`)
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
