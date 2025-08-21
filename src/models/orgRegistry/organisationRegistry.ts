import { inject, injectable, singleton } from 'tsyringe'

import { Env } from '../../env/index.js'
import { InternalError } from '../../errors.js'
import { type ILogger, Logger } from '../../logger.js'
import { RegistryType } from '../db/types.js'
import { COMPANY_NUMBER, CountryCode, NY_STATE_NUMBER } from '../stringTypes.js'
import { organisationRegistryProfile } from './helpers.js'

export type Registries = Record<
  RegistryType,
  { url: string; api_key: string; country_code: CountryCode[]; third_party: boolean; registry_name: string }
>

export type StrippedRegistryInfo = Record<
  RegistryType,
  { country_code: CountryCode[]; third_party: boolean; registry_name: string }
>

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
  companyNumber: NY_STATE_NUMBER | COMPANY_NUMBER
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
  private registries: Promise<Registries>
  private strippedRegistries: Promise<StrippedRegistryInfo>

  constructor(
    private env: Env,
    @inject(Logger) private logger: ILogger
  ) {
    this.registries = this.getConfiguredRegistries()
    this.strippedRegistries = this.getStrippedRegistriesInfo()
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

  async getOrganisationProfileByOrganisationNumber(orgReq: OrganisationRequest): Promise<OrganisationProfile> {
    this.logger.info(`Retrieving organisation profile for ${orgReq.companyNumber} in ${orgReq.registryCountryCode}`)
    const registry = await this.resolveOrganisationRegistry(orgReq.registryCountryCode, orgReq.selectedRegistry)
    if (!registry) {
      throw new InternalError(`Registry for ${orgReq.registryCountryCode} not set`)
    }
    return await organisationRegistryProfile(orgReq, registry, this.logger)
  }

  async localOrganisationProfile(): Promise<SharedOrganisationInfo> {
    return await this.localOrganisationProfilePromise
  }
  async strippedRegistriesInfo(): Promise<StrippedRegistryInfo> {
    return await this.strippedRegistries
  }

  private async resolveOrganisationRegistry(
    registryCountryCode: CountryCode,
    registryType: RegistryType
  ): Promise<Registries[RegistryType] | null> {
    this.logger.info(`Resolving organisation registry for ${registryCountryCode}`)

    if (registryType !== null) {
      const registries = await this.registries
      const registry = registries[registryType]

      if (registry && registry.country_code.includes(registryCountryCode)) {
        this.logger.info(`Resolved organisation registry for ${registryCountryCode} to ${registryType}`)

        return registry
      }
    }
    this.logger.info(`${registryType} registry is not configured for ${registryCountryCode}`)
    return null
  }
  private async getConfiguredRegistries(): Promise<Registries> {
    // TODO: should this be loaded conditionally in the future?
    return {
      company_house: {
        registry_name: 'Companies House',
        url: this.env.get('COMPANY_HOUSE_API_URL'),
        api_key: this.env.get('COMPANY_PROFILE_API_KEY'),
        country_code: ['GB'],
        third_party: false,
      },
      open_corporates: {
        registry_name: 'Open Corporates',
        url: this.env.get('OPEN_CORPORATES_API_URL'),
        api_key: this.env.get('OPEN_CORPORATES_API_KEY'),
        country_code: ['GB', 'NL', 'JP'],
        third_party: true,
      },
      ny_state: {
        registry_name: 'New York State',
        url: this.env.get('NY_STATE_API_URL'),
        api_key: '',
        country_code: ['US'],
        third_party: false,
      },
    }
  }

  private async getStrippedRegistriesInfo(): Promise<StrippedRegistryInfo> {
    const registries = await this.registries
    return {
      company_house: {
        country_code: registries.company_house.country_code,
        third_party: registries.company_house.third_party,
        registry_name: registries.company_house.registry_name,
      },
      open_corporates: {
        country_code: registries.open_corporates.country_code,
        third_party: registries.open_corporates.third_party,
        registry_name: registries.open_corporates.registry_name,
      },
      ny_state: {
        country_code: registries.ny_state.country_code,
        third_party: registries.ny_state.third_party,
        registry_name: registries.ny_state.registry_name,
      },
    }
  }
}
