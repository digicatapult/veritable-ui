import z from 'zod'
import { InternalError } from '../../errors.js'
import { ILogger } from '../../logger.js'
import { RegistryType } from '../db/types.js'
import { OrganisationProfile, OrganisationRequest, Registries, SharedOrganisationInfo } from './organisationRegistry.js'
import { companyHouseResultSchema } from './registrySchemas/companyHouseSchema.js'
import { nyStateResultSchema } from './registrySchemas/NYStateSchema.js'
import { openCorporatesResultSchema } from './registrySchemas/openCorporatesSchema.js'

export const makeOrganisationRegistryRequest = async (
  route: string,
  registryName: string,
  apiKey: string | null
): Promise<unknown> => {
  const url = new URL(route)

  const headers: HeadersInit = {}
  if (apiKey !== null) {
    headers.Authorization = apiKey
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
  })
  const contentType = response.headers.get('content-type')
  if (response.ok) {
    if (contentType && contentType.includes('application/json')) {
      return response.json()
    }
    throw new InternalError(`Unexpected content-type ${contentType} from ${registryName} API, for ${url.toString()}`)
  }

  if (response.status === 404) {
    return null
  }

  throw new InternalError(`Error calling ${registryName} API`)
}
const retrieveEndpointAndSchema = (
  orgReq: OrganisationRequest,
  registry: Registries[RegistryType]
): { url: string; schema: z.ZodSchema; apiKey?: string } => {
  switch (orgReq.selectedRegistry) {
    case 'company_house':
      return {
        url: `${registry.url}/company/${encodeURIComponent(orgReq.companyNumber)}`,
        schema: companyHouseResultSchema,
        apiKey: registry.api_key,
      }

    case 'ny_state':
      return { url: `${registry.url}?dos_id=${orgReq.companyNumber}`, schema: nyStateResultSchema }

    case 'open_corporates':
      return {
        url: `${registry.url}/companies/${orgReq.registryCountryCode.toLowerCase()}/${encodeURIComponent(orgReq.companyNumber)}?api_token=${registry.api_key}`,
        schema: openCorporatesResultSchema,
      }

    default:
      throw new InternalError(`Registry ${orgReq.selectedRegistry} not set`)
  }
}

export const organisationRegistryProfile = async (
  orgReq: OrganisationRequest,
  registry: Registries[RegistryType],
  logger: ILogger
): Promise<OrganisationProfile> => {
  logger.info(`Getting ${registry.registry_name} profile for ${orgReq.companyNumber}`)
  const urlAndSchema = retrieveEndpointAndSchema(orgReq, registry)
  const companyProfile = await makeOrganisationRegistryRequest(
    urlAndSchema.url,
    registry.registry_name,
    urlAndSchema.apiKey ? urlAndSchema.apiKey : null
  )
  if (companyProfile === null) {
    return { type: 'notFound' }
  }
  try {
    const result = urlAndSchema.schema.parse(companyProfile)
    const sharedInfo = result as SharedOrganisationInfo
    return { type: 'found', company: sharedInfo }
  } catch (error) {
    logger.error(`Error parsing ${registry.registry_name} profile for ${orgReq.companyNumber}: ${error}`)
    return { type: 'notFound' }
  }
}
