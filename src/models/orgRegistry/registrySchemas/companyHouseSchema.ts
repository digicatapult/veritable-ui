import { z } from 'zod'
import { RegistryType } from '../../db/types.js'
import { companyNumberRegex, CountryCode } from '../../stringTypes.js'

export type CompanyHouseProfile = z.infer<typeof companyHouseProfileSchema>

export const companyHouseProfileSchema = z.object({
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
  company_status: z.enum([
    'active',
    'dissolved',
    'liquidation',
    'receivership',
    'converted-closed',
    'voluntary-arrangement',
    'insolvency-proceedings',
    'administration',
    'open',
    'closed',
    'registered',
    'removed',
  ]),
})

export const companyHouseResultSchema = companyHouseProfileSchema.transform((c) => {
  const a = c.registered_office_address

  const address = [
    c.company_name,
    a.address_line_1,
    a.address_line_2,
    a.care_of,
    a.locality,
    a.po_box,
    a.postal_code,
    a.country,
    a.premises,
    a.region,
  ]
    .filter(Boolean)
    .join(', ')

  return {
    name: c.company_name,
    address,
    number: c.company_number,
    status: c.company_status,
    registryCountryCode: 'GB' as CountryCode,
    registeredOfficeIsInDispute: c.registered_office_is_in_dispute ?? false,
    selectedRegistry: 'company_house' as RegistryType,
  }
})
