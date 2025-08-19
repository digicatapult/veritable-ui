import { RegistryType } from '../../db/types.js'
import { OpenCorporatesProfile } from '../../orgRegistry/openCorporatesRegistry/index.js'
import { SharedOrganisationInfo } from '../../orgRegistry/organisationRegistry.js'
import { CountryCode } from '../../stringTypes.js'
export const validCompanyNumber = '00102498'
export const secondaryCompanyNumber = '11111111'
export const invalidCompanyNumber = '079646992'
export const noCompanyNumber = ''
export const gbCountryCode = 'GB' as CountryCode

export const successResponse: OpenCorporatesProfile = {
  api_version: '0.4',
  results: {
    company: {
      name: 'BP P.L.C.',
      jurisdiction_code: 'gb',
      inactive: false,
      company_number: '00102498',
      current_status: 'Active',
      registered_address_in_full: "1 ST JAMES'S SQUARE, LONDON, SW1Y 4PD",
    },
  },
}

export const finalSuccessResponse: SharedOrganisationInfo = {
  name: 'BP P.L.C.',
  address: "1 ST JAMES'S SQUARE, LONDON, SW1Y 4PD",
  status: 'active',
  number: '00102498',
  registryCountryCode: 'GB' as CountryCode,
  registeredOfficeIsInDispute: false,
  selectedRegistry: 'open_corporates' as RegistryType,
}
