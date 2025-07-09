import { RegistryCountryCode } from '../../../controllers/connection/strings.js'
import { SharedOrganisationInfo } from '../../../models/orgRegistry/organisationRegistry.js'
import { FormFeedback } from '../base.js'

export const successResponse: SharedOrganisationInfo = {
  name: 'DIGITAL CATAPULT',
  address: 'Level 9, 101 Euston Road, London, NW1 2RA',
  status: 'active',
  number: '07964699',
  registryCountryCode: RegistryCountryCode.UK,
}

export const testErrorTargetBox: FormFeedback = {
  type: 'error',
  error: 'This is a test error message',
}

export const testMessageTargetBox: FormFeedback = {
  type: 'message',
  message: 'This is a message',
}

export const testSuccessTargetBox: FormFeedback = {
  type: 'companyFound',
  company: successResponse,
}
