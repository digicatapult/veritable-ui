import { z } from 'zod'
import { RegistryType } from '../../db/types.js'
import { companyNumberRegex, CountryCode } from '../../stringTypes.js'

export const openCorporatesSchema = z.object({
  api_version: z.string(),
  results: z.object({
    company: z.object({
      name: z.string(),
      jurisdiction_code: z.string(),
      inactive: z.boolean(),
      company_number: z.string().regex(new RegExp(companyNumberRegex)).min(8).max(8), //TODO: update regex
      current_status: z.union([
        z.literal('Active'),
        z.literal('Active/Compliance'), //TODO: add other statuses
      ]),
      registered_address_in_full: z.string(),
    }),
  }),
})

type OpenCorporatesProfile = z.infer<typeof openCorporatesSchema>

export const openCorporatesResultSchema = openCorporatesSchema.transform((input) => {
  const c = input.results.company
  return {
    name: c.name,
    address: c.registered_address_in_full,
    number: c.company_number,
    status: c.current_status.toLowerCase(),
    registryCountryCode: c.jurisdiction_code.toUpperCase() as CountryCode,
    registeredOfficeIsInDispute: false,
    selectedRegistry: 'open_corporates' as RegistryType,
  }
})
