import { randomUUID } from 'crypto'
import type { ConnectionRow } from '../../../models/db/types.js'

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
  company_name: 'NAME',
  company_number: validCompanyNumber,
  registered_office_address: {
    address_line_1: 'ADDRESS_LINE_1',
    address_line_2: 'ADDRESS_LINE_2',
    care_of: 'CARE_OF',
    country: 'COUNTRY',
    locality: 'LOCALITY',
    po_box: 'PO_BOX',
    postal_code: 'POSTAL_CODE',
    premises: 'PREMISES',
    region: 'REGION',
  },
  registered_office_is_in_dispute: false,
  company_status: 'active',
}

export const validExistingCompany = {
  ...validCompany,
  company_number: validExistingCompanyNumber,
  company_name: 'NAME2',
}

export const validCompanyInDispute = {
  ...validCompany,
  company_number: validCompanyNumberInDispute,
  company_name: 'NAME3',
  registered_office_is_in_dispute: true,
}

export const validCompanyInactive = {
  ...validCompany,
  company_number: validCompanyNumberInDispute,
  company_name: 'NAME4',
  company_status: 'inactive',
}

export const verifiedBothCompany = {
  ...validCompany,
  company_number: verifiedBothCompanyNumber,
  company_name: 'VERIFIED_BOTH',
}

export const noInviteCompany = {
  ...validCompany,
  company_number: noExistingInviteCompanyNumber,
  company_name: 'NO_INVITE',
}

export const usedPendingCompany = {
  ...validCompany,
  company_number: usedPendingCompanyNumber,
  company_name: 'USED_PENDING',
}

export const tooManyDisconnectCompany = {
  ...validCompany,
  company_number: tooManyDisconnectedCompanyNumber,
  company_name: 'TOO_MANY_DISCONNECTED',
}

export const validDisconnectedCompany = {
  ...validCompany,
  company_number: validDisconnectedCompanyNumber,
  company_name: 'VALID_DISCONNECTED',
}

export const usedUnVerifiedCompany = {
  ...validCompany,
  company_number: usedUnverifiedCompanyNumber,
  company_name: 'USED_UNVERIFIED',
}

export const usedVerifiedThemCompany = {
  ...validCompany,
  company_number: usedVerifiedThemCompanyNumber,
  company_name: 'USED_VER_THEM',
}

export const usedVerifiedUsCompany = {
  ...validCompany,
  company_number: usedVerifiedUsCompanyNumber,
  company_name: 'USED_VER_US',
}

export const usedDisconnectedCompany = {
  ...validCompany,
  company_number: usedDisconnectedCompanyNumber,
  company_name: 'USED_DISCONNECTED',
}

export const validPendingCompany = {
  ...validCompany,
  company_number: validPendingCompanyNumber,
  company_name: 'ALLOW_NEW',
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
}

const buildBase64Invite = (companyNumber: string) =>
  Buffer.from(
    JSON.stringify({
      companyNumber,
      inviteUrl: 'http://example.com',
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
