import { injectable, singleton } from 'tsyringe'
import { z } from 'zod'

import { Env } from '../env.js'
import { InternalError } from '../errors.js'
import { companyNumberRegex } from './strings.js'

const companyProfileSchema = z.object({
  company_number: z.string().regex(new RegExp(companyNumberRegex)).min(8).max(8),
  company_name: z.string(),
  registered_office_address: z.object({
    address_line_1: z.string().optional(),
    address_line_2: z.string().optional(),
    care_of: z.string().optional(),
    country: z.string().optional(),
    locality: z.string().optional(),
    po_box: z.string().optional(),
    postal_code: z.string().optional(),
    premises: z.string().optional(),
    region: z.string().optional(),
  }),
  registered_office_is_in_dispute: z.boolean().optional(),
  company_status: z.union([
    z.literal('active'),
    z.literal('dissolved'),
    z.literal('liquidation'),
    z.literal('receivership'),
    z.literal('converted-closed'),
    z.literal('voluntary-arrangement'),
    z.literal('insolvency-proceedings'),
    z.literal('administration'),
    z.literal('open'),
    z.literal('closed'),
    z.literal('registered'),
    z.literal('removed'),
  ]),
})
export type CompanyProfile = z.infer<typeof companyProfileSchema>

export type CompanyProfileResult =
  | {
      type: 'found'
      company: CompanyProfile
    }
  | {
      type: 'notFound'
    }

@singleton()
@injectable()
export default class CompanyHouseEntity {
  constructor(private env: Env) {}

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
  async getCompanyProfileByCompanyNumber(companyNumber: string): Promise<CompanyProfileResult> {
    const endpoint = `${this.env.get('COMPANY_HOUSE_API_URL')}/company/${encodeURIComponent(companyNumber)}`
    const companyProfile = await this.makeCompanyProfileRequest(endpoint)
    console.log({ companyProfile })
    return companyProfile === null
      ? { type: 'notFound' }
      : { type: 'found', company: companyProfileSchema.parse(companyProfile) }
  }
}
