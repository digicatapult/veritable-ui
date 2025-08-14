import { randomUUID } from 'crypto'
import type { ConnectionRow, OrganisationRegistriesRow, RegistryType } from '../../../models/db/types.js'
import { COMPANY_NUMBER, CountryCode, SOCRATA_NUMBER, UUID } from '../../../models/stringTypes.js'
export const notFoundCompanyNumber = '00000000'
export const invalidCompanyNumber = 'XXXXXXXX'
export const validCompanyNumber = '00000001'
export const validExistingCompanyNumber = '00000002'
export const validCompanyNumberInDispute = '00000003'
export const validCompanyNumberInactive = '00000004'

export const verifiedBothCompanyNumber = '00000010'
export const noExistingInviteCompanyNumber = '00000011'
export const usedPendingCompanyNumber = '00000012'
export const tooManyDisconnectedCompanyNumber = '00000013'
export const validDisconnectedCompanyNumber = '00000014'
export const usedVerifiedThemCompanyNumber = '00000015'
export const usedUnverifiedCompanyNumber = '00000016'
export const usedVerifiedUsCompanyNumber = '00000017'
export const usedDisconnectedCompanyNumber = '00000018'
export const validPendingCompanyNumber = '00000019'

export const validInvite = 'aaaa'
export const expiredInvite = 'bbbb'
export const tooManyInvite = 'cccc'
export const usedInvite = 'dddd'

export const validCompany = {
  name: 'NAME',
  number: validCompanyNumber,
  address: 'ADDRESS_LINE_1, ADDRESS_LINE_2, COUNTRY, LOCALITY, PO_BOX, POSTAL_CODE, REGION',
  status: 'active',
  registryCountryCode: 'GB' as CountryCode,
  selectedRegistry: 'company_house' as RegistryType,
  registeredOfficeIsInDispute: false,
}

export const validExistingCompany = {
  ...validCompany,
  number: validExistingCompanyNumber,
  name: 'NAME2',
}

export const validCompanyInDispute = {
  ...validCompany,
  number: validCompanyNumberInDispute,
  name: 'NAME3',
  registeredOfficeIsInDispute: true,
}

export const validCompanyInactive = {
  ...validCompany,
  number: validCompanyNumberInactive,
  name: 'NAME4',
  status: 'inactive',
}

export const verifiedBothCompany = {
  ...validCompany,
  number: verifiedBothCompanyNumber,
  name: 'VERIFIED_BOTH',
}

export const noInviteCompany = {
  ...validCompany,
  number: noExistingInviteCompanyNumber,
  name: 'NO_INVITE',
}

export const usedPendingCompany = {
  ...validCompany,
  number: usedPendingCompanyNumber,
  name: 'USED_PENDING',
}

export const tooManyDisconnectCompany = {
  ...validCompany,
  number: tooManyDisconnectedCompanyNumber,
  name: 'TOO_MANY_DISCONNECTED',
}

export const validDisconnectedCompany = {
  ...validCompany,
  number: validDisconnectedCompanyNumber,
  name: 'VALID_DISCONNECTED',
}

export const usedUnVerifiedCompany = {
  ...validCompany,
  number: usedUnverifiedCompanyNumber,
  name: 'USED_UNVERIFIED',
}

export const usedVerifiedThemCompany = {
  ...validCompany,
  number: usedVerifiedThemCompanyNumber,
  name: 'USED_VER_THEM',
}

export const usedVerifiedUsCompany = {
  ...validCompany,
  number: usedVerifiedUsCompanyNumber,
  name: 'USED_VER_US',
}

export const usedDisconnectedCompany = {
  ...validCompany,
  number: usedDisconnectedCompanyNumber,
  name: 'USED_DISCONNECTED',
}

export const validPendingCompany = {
  ...validCompany,
  number: validPendingCompanyNumber,
  name: 'ALLOW_NEW',
}

export const validConnection: ConnectionRow = {
  id: '4a5d4085-5924-43c6-b60d-754440332e3d',
  agent_connection_id: randomUUID(),
  created_at: new Date(),
  updated_at: new Date(),
  status: 'pending',
  company_number: validCompanyNumber,
  company_name: 'must be a valid company name',
  pin_attempt_count: 0,
  pin_tries_remaining_count: 0,
  registry_country_code: 'GB' as CountryCode,
  registry_code: 'company_house' as RegistryType,
}

export const validRegistry: OrganisationRegistriesRow = {
  id: '4a5d4085-5924-43c6-b60d-754440332e3d',
  country_code: 'GB' as CountryCode,
  registry_name: 'Company House',
  registry_key: 'company_house' as RegistryType,
  third_party: false,
  created_at: new Date(),
  updated_at: new Date(),
  url: 'https://api.company-house.gov.uk',
  api_key: 'test-key',
}

export const validCompanyMap: Record<string, typeof validCompany> = {
  [validCompanyNumber]: validCompany,
  [validCompanyNumberInDispute]: validCompanyInDispute,
  [validCompanyNumberInactive]: validCompanyInactive,
  [validExistingCompanyNumber]: validExistingCompany,
  [verifiedBothCompanyNumber]: verifiedBothCompany,
  [noExistingInviteCompanyNumber]: noInviteCompany,
  [usedPendingCompanyNumber]: usedPendingCompany,
  [tooManyDisconnectedCompanyNumber]: tooManyDisconnectCompany,
  [validDisconnectedCompanyNumber]: validDisconnectedCompany,
  [usedUnverifiedCompanyNumber]: usedUnVerifiedCompany,
  [usedVerifiedThemCompanyNumber]: usedVerifiedThemCompany,
  [usedVerifiedUsCompanyNumber]: usedVerifiedUsCompany,
  [usedDisconnectedCompanyNumber]: usedDisconnectedCompany,
  [validPendingCompanyNumber]: validPendingCompany,
}

export const companyNumberToConnectionMap: Record<string, [{ id: UUID; status: string }] | object> = {
  [validCompanyNumber]: [],
  [noExistingInviteCompanyNumber]: [{}],
  [verifiedBothCompanyNumber]: [{ id: usedInvite, status: 'verified_both' }],
  [usedPendingCompanyNumber]: [{ id: usedInvite, status: 'pending' }],
  [usedVerifiedThemCompanyNumber]: [{ id: usedInvite, status: 'verified_them' }],
  [usedDisconnectedCompanyNumber]: [{ id: usedInvite, status: 'disconnected' }],
  [tooManyDisconnectedCompanyNumber]: [{ id: tooManyInvite, status: 'disconnected' }],
  [validDisconnectedCompanyNumber]: [{ id: validInvite, status: 'disconnected' }],
  [usedUnverifiedCompanyNumber]: [{ id: usedInvite, status: 'unverified' }],
  [usedVerifiedUsCompanyNumber]: [{ id: usedInvite, status: 'verified_us' }],
  [validPendingCompanyNumber]: [{ id: validInvite, status: 'pending' }],
}

export const inviteValidityMap: Record<string, [{ validity: string }]> = {
  [validInvite]: [{ validity: 'valid' }],
  [expiredInvite]: [{ validity: 'expired' }],
  [tooManyInvite]: [{ validity: 'too_many_attempts' }],
  [usedInvite]: [{ validity: 'used' }],
}

const buildBase64Invite = (companyNumber: COMPANY_NUMBER | SOCRATA_NUMBER) =>
  Buffer.from(
    JSON.stringify({
      companyNumber,
      inviteUrl: 'http://example.com',
      goalCode: 'GB' as CountryCode,
    }),
    'utf8'
  ).toString('base64url')

export const invalidBase64Invite = '!@£$%^&*()'
export const invalidInvite = Buffer.from(JSON.stringify({}), 'utf8').toString('base64url')

export const invalidCompanyNumberInvite = buildBase64Invite(invalidCompanyNumber)
export const notFoundCompanyNumberInvite = buildBase64Invite(notFoundCompanyNumber)
export const validExistingCompanyNumberInvite = buildBase64Invite(validExistingCompanyNumber)
export const validCompanyNumberInDisputeInvite = buildBase64Invite(validCompanyNumberInDispute)
export const validCompanyNumberInactiveInvite = buildBase64Invite(validCompanyNumberInactive)
export const validCompanyNumberInvite = buildBase64Invite(validCompanyNumber)
