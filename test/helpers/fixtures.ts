import { OrganisationProfile } from '../../src/models/organisationRegistry.js'

export const bob = {
  registered_office_address: {
    address_line_1: 'Offshore House',
    address_line_2: 'Albert Street',
    locality: 'Blyth',
    postal_code: 'NE24 1LZ',
    region: 'Northumberland',
  },
  company_status: 'active',
  registered_office_is_in_dispute: false,
  company_name: 'OFFSHORE RENEWABLE ENERGY CATAPULT',
  company_number: '04659351',
}

export const charlie = {
  registered_office_address: {
    address_line_1: "12th Floor Tower Wing Guy's Hospital",
    address_line_2: 'Great Maze Pond',
    country: 'United Kingdom',
    locality: 'London',
    postal_code: 'SE1 9RT',
  },
  registered_office_is_in_dispute: false,
  company_status: 'active',
  company_name: 'OFFSHORE RENEWABLE ENERGY CATAPULT',
  company_number: '10016023',
}

export const validCompanyNumber = '07964699'
export const bobCompanyNumber = '04659351'
export const charlieCompanyNumber = '10016023'
export const validCompanyName = 'DIGITAL CATAPULT'

export const successResponse: OrganisationProfile = {
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
