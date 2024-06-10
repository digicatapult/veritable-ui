import { CompanyProfile } from '../../../models/companyHouseEntity.js'
import { FormFeedback } from '../base.js'

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

export const testErrorTargetBox: FormFeedback = {
  type: 'message',
  message: 'This is a test error message',
}

export const testSuccessTargetBox: FormFeedback = {
  type: 'companyFound',
  company: successResponse,
}
