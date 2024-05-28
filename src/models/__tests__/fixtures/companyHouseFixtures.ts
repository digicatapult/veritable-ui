import { CompanyProfileText } from '../../../views/newConnection'
import { CompanyProfile } from '../../companyHouseEntity'

export const validCompanyNumber = '10592650'
export const invalidCompanyNumber = '105926502'
export const noCompanyNumber = ''

export const successResponse: CompanyProfile = {
  registered_office_address: {
    address_line_1: '51 Mornington Crescent',
    locality: 'Hounslow',
    postal_code: 'TW5 9ST',
    country: 'United Kingdom',
  },
  company_status: 'dissolved',
  registered_office_is_in_dispute: false,
  company_name: 'SMH IOT SOLUTIONS LTD',
  company_number: '10592650',
}

export const testErrorTargetBox: CompanyProfileText = {
  status: 'error',
  errorMessage: 'This is a test error message',
}

export const testSuccessTargetBox: CompanyProfileText = {
  status: 'success',
  company: successResponse,
}
