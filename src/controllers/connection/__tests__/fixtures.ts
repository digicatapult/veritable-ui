export const notFoundCompanyNumber = '00000000'
export const invalidCompanyNumber = 'XXXXXXXX'
export const validCompanyNumber = '00000001'
export const validExistingCompanyNumber = '00000002'
export const validCompanyNumberInDispute = '00000003'
export const validCompanyNumberInactive = '00000004'

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

export const validCompanyMap: Record<string, typeof validCompany> = {
  [validCompanyNumber]: validCompany,
  [validExistingCompanyNumber]: validExistingCompany,
  [validCompanyNumberInDispute]: validCompanyInDispute,
  [validCompanyNumberInactive]: validCompanyInactive,
}
