import { Readable } from 'node:stream'
import { pino } from 'pino'

import sinon from 'sinon'
import { Env } from '../../../env/index.js'
import { ILogger } from '../../../logger.js'
import Database from '../../../models/db/index.js'
import { ConnectionRow, RegistryType } from '../../../models/db/types.js'
import { BavResFields } from '../../../models/drpc.js'
import EmailService from '../../../models/emailService/index.js'
import OrganisationRegistry, { OrganisationRequest } from '../../../models/orgRegistry/organisationRegistry.js'
import { CountryCode, UUID } from '../../../models/stringTypes.js'
import VeritableCloudagent from '../../../models/veritableCloudagent/index.js'
import ConnectionTemplates from '../../../views/connection/connection.js'
import { FormFeedback } from '../../../views/newConnection/base.js'
import { FromInviteTemplates } from '../../../views/newConnection/fromInvite.js'
import { NewInviteTemplates } from '../../../views/newConnection/newInvite.js'
import { PinSubmissionTemplates } from '../../../views/newConnection/pinSubmission.js'
import {
  companyNumberToConnectionMap,
  inviteValidityMap,
  notFoundCompanyNumber,
  validCompanyMap,
  validConnection,
} from './fixtures.js'

function templateFake(templateName: string, ...args: unknown[]) {
  return Promise.resolve([templateName, args.join('-'), templateName].join('_'))
}

export const withConnectionMocks = (
  initialPinAttemptTries: number | null,
  finalPinAttemptTries: number | null,
  finalStatus: string
) => {
  const templateMock = {
    listPage: (connections: ConnectionRow[]) =>
      templateFake('list', connections[0].company_name, connections[0].status),
    profilePage: (connection: ConnectionRow, bankDetails?: BavResFields) =>
      templateFake(
        'profilePage',
        connection.id,
        connection.status,
        bankDetails ? JSON.stringify(bankDetails) : 'noBankDetails'
      ),
    disconnectPage: (connection: ConnectionRow, disconnect: boolean = false) =>
      templateFake('disconnectPage', connection.id, connection.status, disconnect),
  }
  let connectionCallCount = 0
  const dbMock = {
    get: (tableName: string, where?: Record<string, string>) => {
      if (tableName === 'query' && where?.connection_id === 'someVerifiedId') {
        return [
          {
            id: 'e3148c39-17f4-4c5f-9189-2a22c1a33283',
            connection_id: 'someVerifiedId',
            status: 'resolved',
            created_at: '2025-09-08 15:53:58.079669+00',
            updated_at: '2025-09-08 15:54:13.578613+00',
            request: '{"subjectId": {"idType": "bav"}}',
            response: {
              name: 'Harry Potter',
              score: 1,
              accountId: '12345678',
              subjectId: { idType: 'bav' },
              countryCode: 'GB',
              description: 'Strong Match',
              clearingSystemId: '123456',
            },
            role: 'requester',
            type: 'beneficiary_account_validation',
            expires_at: '2025-09-10 15:53:00+00',
          },
        ]
      }
      if (tableName === 'connection' && where?.id === 'someVerifiedId') {
        return [
          {
            id: 'someVerifiedId',
            status: 'verified_both',
            address: 'ADDRESS_LINE_1, ADDRESS_LINE_2, COUNTRY, LOCALITY, PO_BOX, POSTAL_CODE, REGION',
            company_name: 'foo',
            agent_connection_id: 'AGENT_CONNECTION_ID',
            pin_tries_remaining_count: initialPinAttemptTries,
          },
        ]
      } else if (tableName === 'connection' && where?.id === 'someId') {
        connectionCallCount++
        // First call: return original connection, second call: return disconnected connection
        if (connectionCallCount === 1) {
          return [
            {
              id: 'someId',
              address: 'ADDRESS_LINE_1, ADDRESS_LINE_2, COUNTRY, LOCALITY, PO_BOX, POSTAL_CODE, REGION',
              company_name: 'foo',
              status: 'unverified',
              agent_connection_id: 'AGENT_CONNECTION_ID',
              pin_tries_remaining_count: initialPinAttemptTries,
            },
          ]
        } else {
          return [
            {
              id: 'someId',
              address: 'ADDRESS_LINE_1, ADDRESS_LINE_2, COUNTRY, LOCALITY, PO_BOX, POSTAL_CODE, REGION',
              company_name: 'foo',
              status: 'disconnected',
              agent_connection_id: 'AGENT_CONNECTION_ID',
              pin_tries_remaining_count: initialPinAttemptTries,
            },
          ]
        }
      } else if (tableName === 'connection') {
        return [
          {
            id: 'someId',
            address: 'ADDRESS_LINE_1, ADDRESS_LINE_2, COUNTRY, LOCALITY, PO_BOX, POSTAL_CODE, REGION',
            company_name: 'foo',
            status: 'unverified',
            agent_connection_id: 'AGENT_CONNECTION_ID',
            pin_tries_remaining_count: initialPinAttemptTries,
          },
        ]
      }
      return []
    },

    waitForCondition: () => [
      {
        id: 'someId',
        created_at: new Date(),
        company_name: 'COMPANY_NAME',
        company_number: 'COMPANY_NUMBER',
        status: finalStatus,
        agent_connection_id: '11110000',
        updated_at: new Date(),
        pin_attempt_count: 0,
        pin_tries_remaining_count: finalPinAttemptTries,
      },
    ],
    update: sinon.stub().resolves(),
  }
  const cloudagentMock = {
    proposeCredential: sinon.stub().resolves(),
    closeConnection: sinon.stub().resolves(),
  }
  const organisationRegistry = {
    localOrganisationProfile: () =>
      Promise.resolve({
        number: 'COMPANY_NUMBER',
        name: 'COMPANY_NAME',
        registryCountryCode: 'GB' as CountryCode,
        status: 'active',
        address: 'ADDRESS',
      }),
  }
  const pinSubmission = {
    renderPinForm: (props: {
      connectionId: UUID
      pin?: string
      continuationFromInvite: boolean
      remainingTries?: string
    }) =>
      templateFake(
        'renderPinForm',
        props.connectionId,
        props.pin,
        props.continuationFromInvite,
        props.remainingTries ? props.remainingTries : 'x'
      ),
    renderSuccess: (props: { companyName: string; stepCount: number }) =>
      templateFake('renderSuccess', props.companyName, props.stepCount),
    renderError: (props: { companyName: string; stepCount: number; errorMessage: string }) =>
      templateFake('renderError', props.companyName, props.stepCount, props.errorMessage),
  }

  return {
    templateMock,
    dbMock,
    cloudagentMock,
    organisationRegistry,
    args: [
      dbMock as unknown as Database,
      cloudagentMock as unknown as VeritableCloudagent,
      organisationRegistry as unknown as OrganisationRegistry,
      templateMock as ConnectionTemplates,
      pinSubmission as unknown as PinSubmissionTemplates,
    ] as const,
  }
}

export const withNewConnectionMocks = () => {
  const mockWithTransaction = {
    insert: () => Promise.resolve([{ id: '42' }]),
    get: () => Promise.resolve([validConnection]),
    update: () => Promise.resolve(),
  }
  const mockDb = {
    get: (tableName: string, where?: Record<string, string>) => {
      if (tableName === 'connection') {
        if (where?.id === '4a5d4085-5924-43c6-b60d-754440332e3d') return [validConnection]
        if (where?.company_number) return companyNumberToConnectionMap[where?.company_number]
        return []
      }
      if (tableName === 'connection_invite') {
        if (where?.connection_id) return inviteValidityMap[where?.connection_id]
        return []
      }
    },
    withTransaction: (fn: (arg: unknown) => unknown) => {
      return Promise.resolve(fn(mockWithTransaction))
    },
  } as unknown as Database

  const mockCompanyHouseEntity = {
    getOrganisationProfileByOrganisationNumber: async ({ companyNumber }: OrganisationRequest) => {
      if (companyNumber === notFoundCompanyNumber) {
        return {
          type: 'notFound',
        }
      }
      if (validCompanyMap[companyNumber]) {
        return {
          type: 'found',
          company: validCompanyMap[companyNumber],
        }
      }
      throw new Error('Invalid number')
    },
    localOrganisationProfile: sinon.stub().resolves({
      number: '07964699',
      name: 'COMPANY_NAME',
      registryCountryCode: 'GB' as CountryCode,
      status: 'active',
      address: 'ADDRESS',
      selectedRegistry: 'company_house' as RegistryType,
      registeredOfficeIsInDispute: false,
    }),
    strippedRegistriesInfo: () =>
      Promise.resolve({
        company_house: {
          country_code: ['GB'],
          third_party: false,
          registry_name: 'Companies House',
        },
        open_corporates: {
          country_code: ['GB', 'NL', 'JP'],
          third_party: true,
          registry_name: 'Open Corporates',
        },
        ny_state: {
          country_code: ['US'],
          third_party: false,
          registry_name: 'New York State',
        },
      }),
  } as unknown as OrganisationRegistry

  const mockCloudagent = {
    createOutOfBandInvite: ({ companyName }: { companyName: string }) => {
      return {
        outOfBandRecord: { id: `id-${companyName}` },
        invitationUrl: `url-${companyName}`,
      }
    },
    receiveOutOfBandInvite: () => {
      return {
        outOfBandRecord: {
          id: 'oob-record',
        },
        connectionRecord: {
          id: 'oob-connection',
        },
      }
    },
  } as unknown as VeritableCloudagent

  const mockEmail = {
    sendMail: () => Promise.resolve(),
  } as unknown as EmailService
  const mockNewInvite = {
    newInviteFormPage: (feedback: FormFeedback) => templateFake('newInvitePage', feedback.type),
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    newInviteForm: ({ feedback, formStage, email, companyNumber }: any) =>
      templateFake(
        'companyFormInput',
        feedback.type,
        feedback.company?.name || '',
        feedback.message || feedback.error || '',
        formStage,
        email,
        companyNumber
      ),
  } as unknown as NewInviteTemplates

  const mockFromInvite = {
    fromInviteFormPage: (feedback: FormFeedback) => templateFake('fromInvitePage', feedback.type),
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    fromInviteForm: ({ feedback }: any) =>
      templateFake(
        'fromInviteForm',
        feedback.type,
        feedback.company?.name || '',
        feedback.message || feedback.error || ''
      ),
  } as unknown as FromInviteTemplates

  const mockPinForm = {
    renderPinForm: (props: { connectionId: UUID; pin?: string; continuationFromInvite: boolean }) =>
      templateFake('renderPinForm', props.connectionId, props.pin, props.continuationFromInvite),
    renderSuccess: (props: { companyName: string; stepCount: number }) =>
      templateFake('renderSuccess', props.companyName, props.stepCount),
  } as unknown as PinSubmissionTemplates

  const mockEnv = {
    get: (name: string) => {
      switch (name) {
        case 'INVITATION_PIN_SECRET':
          return Buffer.from('secret', 'utf8')
        case 'INVITATION_FROM_COMPANY_NUMBER':
          return '07964699'
        case 'LOCAL_REGISTRY_COUNTRY_CODE':
          return 'GB'
        case 'LOCAL_REGISTRY_TO_USE':
          return 'company_house'
        default:
          throw new Error()
      }
    },
  } as unknown as Env
  const mockLogger: ILogger = pino({ level: 'silent' })

  return {
    mockWithTransaction,
    mockDb,
    mockCompanyHouseEntity,
    mockCloudagent,
    mockEmail,
    mockNewInvite,
    mockFromInvite,
    mockPinForm,
    mockEnv,
    mockLogger,
    args: [
      mockDb,
      mockCompanyHouseEntity,
      mockCloudagent,
      mockEmail,
      mockNewInvite,
      mockFromInvite,
      mockPinForm,
      mockEnv,
      mockLogger,
    ] as const,
  }
}

export const withCheckDbMocks = () => {
  const mockLogger: ILogger = pino({ level: 'silent' })
  return {
    mockLogger,
    args: [mockLogger] as const,
  }
}

export const toHTMLString = async (stream: Readable) => {
  const chunks: Uint8Array[] = []
  for await (const chunk of stream) {
    chunks.push(chunk as Uint8Array)
  }
  return Buffer.concat(chunks).toString('utf8')
}
