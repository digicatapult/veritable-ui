import { CompanyProfile } from '../../src/models/companyHouseEntity.js'

export const bob = {
  registered_office_address: {
    address_line_1: 'Level 9, 101 Euston Road',
    postal_code: 'NW1 2RA',
    locality: 'London',
  },
  company_status: 'active',
  registered_office_is_in_dispute: false,
  company_name: 'BOB and CO Limited',
  company_number: '04659351',
}
export const charlie = {
  registered_office_address: {
    address_line_1: 'Level 9, 101 Euston Road',
    postal_code: 'NW1 2RA',
    locality: 'London',
  },
  company_status: 'active',
  registered_office_is_in_dispute: false,
  company_name: 'CHARLIE LTD',
  company_number: '10016023',
}
export const validCompanyNumber = '07964699'
export const bobCompanyNumber = '04659351'
export const charlieCompanyNumber = '10016023'
export const validCompanyName = 'DIGITAL CATAPULT'

export const successResponse: CompanyProfile = {
  registered_office_address: {
    address_line_1: 'Level 9, 101 Euston Road',
    postal_code: 'NW1 2RA',
    locality: 'London',
  },
  company_status: 'active',
  registered_office_is_in_dispute: false,
  company_name: validCompanyName,
  company_number: validCompanyNumber,
}
