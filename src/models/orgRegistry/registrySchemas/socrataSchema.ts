import z from 'zod'
import { RegistryType } from '../../db/types.js'
import { CountryCode } from '../../stringTypes.js'

export const dosEntitySchema = z
  .array(
    z.object({
      dos_id: z.string(),
      current_entity_name: z.string(),
      initial_dos_filing_date: z.string(),
      county: z.string(),
      jurisdiction: z.string(),
      entity_type: z.string(),
      dos_process_name: z.string(),
      dos_process_address_1: z.string(),
      dos_process_city: z.string(),
      dos_process_state: z.string().length(2),
      dos_process_zip: z.string(),
    })
  )
  .transform((entities) => {
    if (entities.length === 0) {
      throw new Error('No entities found')
    }

    const e = entities[0] // assuming first entry is the one we want
    return {
      name: e.current_entity_name,
      address: [
        e.current_entity_name,
        e.dos_process_address_1,
        `${e.dos_process_city}, ${e.dos_process_state} ${e.dos_process_zip}`,
      ]
        .filter(Boolean)
        .join(', '),
      number: e.dos_id,
      status: 'active',
      registryCountryCode: 'US' as CountryCode,
      registeredOfficeIsInDispute: false,
      selectedRegistry: 'socrata' as RegistryType,
    }
  })
