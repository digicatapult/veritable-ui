import { Readable } from 'node:stream'
import { pino } from 'pino'

import sinon from 'sinon'
import { Env } from '../../../env/index.js'
import { ILogger } from '../../../logger.js'
import Database from '../../../models/db/index.js'
import { ConnectionRow } from '../../../models/db/types.js'
import EmailService from '../../../models/emailService/index.js'
import OrganisationRegistry from '../../../models/orgRegistry/organisationRegistry.js'
import { CountryCode } from '../../../models/strings.js'
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
  }
  const dbMock = {
    get: () => [
      {
        company_name: 'foo',
        status: 'unverified',
        agent_connection_id: 'AGENT_CONNECTION_ID',
        pin_tries_remaining_count: initialPinAttemptTries,
      },
    ],
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
  }
  const cloudagentMock = {
    proposeCredential: sinon.stub().resolves(),
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
      connectionId: string
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
    getOrganisationProfileByOrganisationNumber: async (companyNumber: string) => {
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
      number: 'COMPANY_NUMBER',
      name: 'COMPANY_NAME',
      registryCountryCode: 'GB' as CountryCode,
      status: 'active',
      address: 'ADDRESS',
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
    renderPinForm: (props: { connectionId: string; pin?: string; continuationFromInvite: boolean }) =>
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
        case 'LOCAL_REGISTRY_TO_USE':
          return 'GB'
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
