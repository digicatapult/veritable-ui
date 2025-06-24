import { injectable, singleton } from 'tsyringe'
import z from 'zod'
import { Env } from '../env/index.js'
import { InternalError } from '../errors.js'
import { companyHouseProfileSchema } from './registrySchemas/companyHouseSchema.js'

// TODO: will need other schemas for other registries

export type OrganisationProfile = z.infer<typeof companyHouseProfileSchema> // TODO: Organisation profile likely different for different types of registries

export type OrganisationProfileResult =
  | {
      type: 'found'
      company: OrganisationProfile
    }
  | {
      type: 'notFound'
    }

@singleton()
@injectable()
export default class OrganisationRegistry {
  private localOrganisationProfilePromise: Promise<OrganisationProfile>

  constructor(private env: Env) {
    this.localOrganisationProfilePromise = this.getCompanyHouseProfileByCompanyNumber(
      env.get('INVITATION_FROM_COMPANY_NUMBER')
    ).then((result) => {
      if (result.type === 'notFound') {
        throw new Error('Invalid local company house number configuration')
      }

      return result.company
    })
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

  /*
    This function will return a companyProfile object
  */
  private async getCompanyHouseProfileByCompanyNumber(companyNumber: string): Promise<OrganisationProfileResult> {
    const endpoint = `${this.env.get('COMPANY_HOUSE_API_URL')}/company/${encodeURIComponent(companyNumber)}`
    const companyProfile = await this.makeCompanyProfileRequest(endpoint)
    return companyProfile === null
      ? { type: 'notFound' }
      : { type: 'found', company: companyHouseProfileSchema.parse(companyProfile) }
  }

  async getOrganisationProfileByOrganisationNumber(companyNumber: string): Promise<OrganisationProfileResult> {
    // TODO: add other registries here
    return this.getCompanyHouseProfileByCompanyNumber(companyNumber)
  }

  async localOrganisationProfile(): Promise<OrganisationProfile> {
    return await this.localOrganisationProfilePromise
  }
}
