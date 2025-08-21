import z from 'zod'
import { OrganisationProfile, OrganisationRequest, Registries } from '../organisationRegistry.js'
import { dosEntitySchema } from '../registrySchemas/NYStateSchema.js'

import { InternalError } from '../../../errors.js'
import { ILogger } from '../../../logger.js'
import { RegistryType } from '../../db/types.js'

export type NYStateProfile = z.infer<typeof dosEntitySchema>

export const nyStateProfile = async (
  orgReq: OrganisationRequest,
  registry: Registries[RegistryType],
  logger: ILogger
): Promise<OrganisationProfile> => {
  logger.info(`Getting ny state profile for ${orgReq.companyNumber}`)
  // NOTE: 3211809 <-- comp no to test NY state registry with
  const endpoint = `${registry.url}?dos_id=${orgReq.companyNumber}` // NOTE: no API key required for low-rate requests
  const companyProfile = await makeNYStateRequest(endpoint)
  if (companyProfile === null) {
    return { type: 'notFound' }
  }
  try {
    const result = dosEntitySchema.parse(companyProfile)
    return { type: 'found', company: result }
  } catch (error) {
    logger.error(`Error parsing ny state profile for ${orgReq.companyNumber}: ${error}`)
    return { type: 'notFound' }
  }
}

const makeNYStateRequest = async (route: string): Promise<unknown> => {
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

  throw new InternalError(`Error calling NY State Registry API`)
}
