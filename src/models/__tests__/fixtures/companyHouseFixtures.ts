import { RegistryCountryCode } from '../../../controllers/connection/strings.js'
import {
  CompanyHouseProfile,
  OrganisationProfile,
  SharedOrganisationInfo,
} from '../../orgRegistry/organisationRegistry.js'

export const validCompanyNumber = '07964699'
export const secondaryCompanyNumber = '11111111'
export const invalidCompanyNumber = '079646992'
export const noCompanyNumber = ''

export const successResponse: CompanyHouseProfile = {
  registered_office_address: {
    address_line_1: 'Level 9, 101 Euston Road',
    postal_code: 'NW1 2RA',
    locality: 'London',
  },
  company_status: 'active',
  registered_office_is_in_dispute: false,
  company_name: 'DIGITAL CATAPULT',
  company_number: '07964699',
}
export const finalSuccessResponse: SharedOrganisationInfo = {
  name: 'DIGITAL CATAPULT',
  address: 'DIGITAL CATAPULT, Level 9, 101 Euston Road, London, NW1 2RA',
  status: 'active',
  number: '07964699',
  registryCountryCode: RegistryCountryCode.UK,
}

export const successResponse2: OrganisationProfile = {
  registered_office_address: {
    address_line_1: 'Flat 3 Nelmes Court, Nelmes Way, Nelmes Way',
    postal_code: 'RM11 2QL',
    locality: 'Hornchurch',
  },
  company_status: 'active',
  registered_office_is_in_dispute: false,
  company_name: 'CARE ONUS LTD',
  company_number: '11111111',
}
