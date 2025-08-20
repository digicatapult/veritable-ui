import z from 'zod'

import { InternalError } from '../../../errors.js'
import { ILogger } from '../../../logger.js'
import { RegistryType } from '../../db/types.js'
import { OrganisationProfile, OrganisationRequest, Registries } from '../organisationRegistry.js'
import { companyHouseProfileSchema, companyHouseResultSchema } from '../registrySchemas/companyHouseSchema.js'

export type CompanyHouseProfile = z.infer<typeof companyHouseProfileSchema>

export const companyHouseProfile = async (
  orgReq: OrganisationRequest,
  registry: Registries[RegistryType],
  logger: ILogger
): Promise<OrganisationProfile> => {
  logger.info(`Getting company house profile for ${orgReq.companyNumber}`)
  const endpoint = `${registry.url}/company/${encodeURIComponent(orgReq.companyNumber)}`
  console.log('comp endpoint', endpoint)
  const companyProfile = await makeCompanyProfileRequest(endpoint, registry)
  console.log('comp profile', companyProfile)
  if (companyProfile === null) {
    return { type: 'notFound' }
  }
  try {
    const result = companyHouseResultSchema.parse(companyProfile)
    return { type: 'found', company: result }
  } catch (error) {
    logger.error(`Error parsing company house profile for ${orgReq.companyNumber}: ${error}`)
    return { type: 'notFound' }
  }
}

const makeCompanyProfileRequest = async (route: string, registry: Registries[RegistryType]): Promise<unknown> => {
  const url = new URL(route)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: new Headers({
      Authorization: registry.api_key,
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
