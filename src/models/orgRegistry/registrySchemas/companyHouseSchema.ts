import { z } from 'zod'
import { companyNumberRegex } from '../../stringTypes.js'

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
