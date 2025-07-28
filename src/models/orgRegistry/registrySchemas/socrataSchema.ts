import z from 'zod'

export const dosEntitySchema = z.array(
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
