import type { Credential } from "../index.js"

export const AliceCredentials: Credential[] = [
  {
    id: 'ee24e268-b1eb-4501-8ecf-37c2a3e76b82',
    state: 'done',
    role: 'issuer',
    companyName: 'DIGITAL CATAPULT',
    type: 'Supplier credentials',
  },
  {
    id: 'dabfcec3-9232-4eaa-abf2-ce64193772ed',
    state: 'done',
    role: 'holder',
    companyName: 'CARE ONUS LTD',
    type: 'Supplier credentials',
  },
]

export const BobCredentials: Credential[] = [
  {
    id: '1e88254d-4e90-4859-b6ad-50c0a30cd947',
    state: 'done',
    role: 'issuer',
    companyName: 'CARE ONUS LTD',
    type: 'Supplier credentials',
  },
  {
    id: 'f70d675a-1915-42b5-b279-ce79a3aceb60',
    state: 'done',
    role: 'holder',
    companyName: 'DIGITAL CATAPULT',
    type: 'Supplier credentials',
  },
]
