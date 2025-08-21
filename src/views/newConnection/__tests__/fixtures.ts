import { RegistryType } from '../../../models/db/types.js'
import { SharedOrganisationInfo } from '../../../models/orgRegistry/organisationRegistry.js'
import { CountryCode } from '../../../models/stringTypes.js'
import { FormFeedback } from '../base.js'

export const successResponse: SharedOrganisationInfo = {
  name: 'DIGITAL CATAPULT',
  address: 'Level 9, 101 Euston Road, London, NW1 2RA',
  status: 'active',
  number: '07964699',
  registryCountryCode: 'GB' as CountryCode,
  selectedRegistry: 'company_house' as RegistryType,
  registeredOfficeIsInDispute: false,
}

export const testErrorTargetBox: FormFeedback = {
  type: 'error',
  error: 'This is a test error message',
}

export const testMessageTargetBox: FormFeedback = {
  type: 'message',
  message: 'This is a message',
  registryOptionsPerCountry: {
    countryRegistries: [],
    thirdPartyRegistries: [],
  },
}

export const testSuccessTargetBox: FormFeedback = {
  type: 'companyFound',
  company: successResponse,
}
