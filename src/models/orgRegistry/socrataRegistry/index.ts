import z from 'zod'
import { OrganisationProfile, OrganisationRequest, Registries } from '../organisationRegistry.js'
import { dosEntitySchema } from '../registrySchemas/socrataSchema.js'

import { InternalError } from '../../../errors.js'
import { ILogger } from '../../../logger.js'
import { RegistryType } from '../../db/types.js'

export type SocrataProfile = z.infer<typeof dosEntitySchema>

export const socrataProfile = async (
  orgReq: OrganisationRequest,
  registry: Registries[RegistryType],
  logger: ILogger
): Promise<OrganisationProfile> => {
  logger.info(`Getting socrata profile for ${orgReq.companyNumber}`)
  // NOTE: 3211809 <-- comp no to test socrata with
  const endpoint = `${registry.url}?dos_id=${orgReq.companyNumber}` // NOTE: no API key required for low-rate requests
  const companyProfile = await makeSocrataRequest(endpoint)
  if (companyProfile === null) {
    return { type: 'notFound' }
  }
  try {
    const result = dosEntitySchema.parse(companyProfile)
    return { type: 'found', company: result }
  } catch (error) {
    logger.error(`Error parsing socrata profile for ${orgReq.companyNumber}: ${error}`)
    return { type: 'notFound' }
  }
}

const makeSocrataRequest = async (route: string): Promise<unknown> => {
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
