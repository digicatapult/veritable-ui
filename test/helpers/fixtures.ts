import { CompanyProfile } from '../../src/models/companyHouseEntity'
import { CompanyProfileText } from '../../src/views/newConnection'

export const validCompanyNumber = '07964699'
export const invalidCompanyNumber = '079646992'
export const noCompanyNumber = ''

export const successResponse: CompanyProfile = {
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

export const testErrorTargetBox: CompanyProfileText = {
  status: 'error',
  errorMessage: 'This is a test error message',
}

export const testSuccessTargetBox: CompanyProfileText = {
  status: 'success',
  company: successResponse,
}