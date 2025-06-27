import { z } from 'zod'
import { companyNumberRegex } from '../../strings'

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
