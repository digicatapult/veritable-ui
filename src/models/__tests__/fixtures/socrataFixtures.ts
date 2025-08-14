import { RegistryType } from '../../db/types.js'
import { SharedOrganisationInfo, SocrataProfile } from '../../orgRegistry/organisationRegistry.js'
import { CountryCode } from '../../stringTypes.js'
export const validCompanyNumber = '3211809'
export const secondaryCompanyNumber = '11111111'
export const invalidCompanyNumber = '079646992'
export const noCompanyNumber = ''

export const successResponse: SocrataProfile = [
  {
    dos_id: '3211809',
    current_entity_name: '00:02:59 LLC',
    initial_dos_filing_date: '2005-05-31T00:00:00.000',
    county: 'Kings',
    jurisdiction: 'New York',
    entity_type: 'DOMESTIC LIMITED LIABILITY COMPANY',
    dos_process_name: '00:02:59 LLC',
    dos_process_address_1: '656 UNION STREET, APT. 2',
    dos_process_city: 'BROOKLYN',
    dos_process_state: 'NY',
    dos_process_zip: '11215',
  },
]
export const finalSuccessResponse: SharedOrganisationInfo = {
  name: '00:02:59 LLC',
  address: '656 UNION STREET, APT. 2, BROOKLYN, NY, 11215',
  status: 'active',
  number: '3211809',
  registryCountryCode: 'US' as CountryCode,
  registeredOfficeIsInDispute: false,
  selectedRegistry: 'socrata' as RegistryType,
}
