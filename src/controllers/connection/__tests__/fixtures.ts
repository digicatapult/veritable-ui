import { randomUUID } from 'crypto'
import type { ConnectionRow } from '../../../models/db/types.js'
import { RegistryCountryCode } from '../strings.js'

export const notFoundCompanyNumber = '00000000'
export const invalidCompanyNumber = 'XXXXXXXX'
export const validCompanyNumber = '00000001'
export const validExistingCompanyNumber = '00000002'
export const validCompanyNumberInDispute = '00000003'
export const validCompanyNumberInactive = '00000004'
export const ukRegistryCountryCode = RegistryCountryCode.UK

export const validCompany = {
  name: 'NAME',
  number: validCompanyNumber,
  address: 'ADDRESS_LINE_1, ADDRESS_LINE_2, COUNTRY, LOCALITY, PO_BOX, POSTAL_CODE, REGION',
  status: 'active',
  registryCountryCode: ukRegistryCountryCode,
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
  // registered_office_is_in_dispute: true, // TODO: add this??
}

export const validCompanyInactive = {
  ...validCompany,
  number: validCompanyNumberInDispute,
  name: 'NAME4',
  status: 'inactive',
}

export const validCompanyMap: Record<string, typeof validCompany> = {
  [validCompanyNumber]: validCompany,
  [validExistingCompanyNumber]: validExistingCompany,
  [validCompanyNumberInDispute]: validCompanyInDispute,
  [validCompanyNumberInactive]: validCompanyInactive,
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
  registry_country_code: ukRegistryCountryCode,
}

const buildBase64Invite = (companyNumber: string) =>
  Buffer.from(
    JSON.stringify({
      companyNumber,
      inviteUrl: 'http://example.com',
      goalCode: ukRegistryCountryCode,
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
