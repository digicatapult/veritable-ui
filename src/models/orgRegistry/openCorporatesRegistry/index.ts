import z from 'zod'
import { InternalError } from '../../../errors.js'
import { ILogger } from '../../../logger.js'
import { RegistryType } from '../../db/types.js'
import { OrganisationProfile, OrganisationRequest, Registries } from '../organisationRegistry.js'
import { openCorporatesResultSchema, openCorporatesSchema } from '../registrySchemas/openCorporatesSchema.js'
export type OpenCorporatesProfile = z.infer<typeof openCorporatesSchema>

export const openCorporatesProfile = async (
  orgReq: OrganisationRequest,
  registry: Registries[RegistryType],
  logger: ILogger
): Promise<OrganisationProfile> => {
  logger.info(`Getting open corporates profile for ${orgReq.companyNumber}`)
  const endpoint = `${registry.url}/companies/${orgReq.registryCountryCode.toLowerCase()}/${encodeURIComponent(orgReq.companyNumber)}?api_token=${registry.api_key}`
  console.log('openCorp endpoint', endpoint)
  const companyProfile = await makeOpenCorporatesRequest(endpoint)
  console.log('openCorp profile', companyProfile)
  if (companyProfile === null) {
    return { type: 'notFound' }
  }
  try {
    const result = openCorporatesResultSchema.parse(companyProfile)
    return { type: 'found', company: result }
  } catch (error) {
    logger.error(`Error parsing open corporates profile for ${orgReq.companyNumber}: ${error}`)
    return { type: 'notFound' }
  }
}

const makeOpenCorporatesRequest = async (route: string): Promise<unknown> => {
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
