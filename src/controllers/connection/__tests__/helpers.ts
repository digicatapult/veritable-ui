import { Readable } from 'node:stream'
import { pino } from 'pino'

import { Env } from '../../../env.js'
import type { ILogger } from '../../../logger.js'
import CompanyHouseEntity from '../../../models/companyHouseEntity.js'
import Database from '../../../models/db/index.js'
import { ConnectionRow } from '../../../models/db/types.js'
import EmailService from '../../../models/emailService/index.js'
import VeritableCloudagent from '../../../models/veritableCloudagent.js'
import ConnectionTemplates from '../../../views/connection.js'
import { FormFeedback } from '../../../views/newConnection/base.js'
import { FromInviteTemplates } from '../../../views/newConnection/fromInvite.js'
import { NewInviteTemplates } from '../../../views/newConnection/newInvite.js'
import { notFoundCompanyNumber, validCompanyMap, validCompanyNumber, validExistingCompanyNumber } from './fixtures.js'

function templateFake(templateName: string, ...args: any[]) {
  return Promise.resolve([templateName, args.join('-'), templateName].join('_'))
}

export const withConnectionMocks = () => {
  const templateMock = {
    listPage: (connections: ConnectionRow[]) =>
      templateFake('list', connections[0].company_name, connections[0].status),
  } as ConnectionTemplates
  const mockLogger: ILogger = pino({ level: 'silent' })
  const dbMock = {
    get: () => Promise.resolve([{ company_name: 'foo', status: 'verified' }]),
  } as unknown as Database

  return {
    templateMock,
    mockLogger,
    dbMock,
  }
}

export const withNewConnectionMocks = () => {
  const mockLogger: ILogger = pino({ level: 'silent' })
  const mockTransactionDb = {
    insert: () => Promise.resolve([{ id: '42' }]),
  }
  const mockDb = {
    get: (tableName: string, where?: Record<string, string>) => {
      if (tableName !== 'connection') throw new Error('Invalid table')
      if (where?.company_number === validCompanyNumber) return []
      if (where?.company_number === validExistingCompanyNumber) return [{}]
      return []
    },
    withTransaction: (fn: Function) => {
      return Promise.resolve(fn(mockTransactionDb))
    },
  } as unknown as Database
  const mockCompanyHouseEntity = {
    getCompanyProfileByCompanyNumber: async (companyNumber: string) => {
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
  } as unknown as CompanyHouseEntity
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
    sendMail: () => {},
  } as unknown as EmailService
  const mockNewInvite = {
    newInviteFormPage: (feedback: FormFeedback) => templateFake('newInvitePage', feedback.type),
    newInviteForm: ({ feedback, formStage, email, companyNumber }: any) =>
      templateFake(
        'companyFormInput',
        feedback.type,
        feedback.company?.company_name || '',
        feedback.message || feedback.error || '',
        formStage,
        email,
        companyNumber
      ),
  } as unknown as NewInviteTemplates
  const mockFromInvite = {
    fromInviteFormPage: (feedback: FormFeedback) => templateFake('fromInvitePage', feedback.type),
    fromInviteForm: ({ feedback, formStage }: any) =>
      templateFake(
        'fromInviteForm',
        feedback.type,
        feedback.company?.company_name || '',
        feedback.message || feedback.error || '',
        formStage
      ),
  } as unknown as FromInviteTemplates

  const mockEnv = {
    get: (name: string) => {
      switch (name) {
        case 'INVITATION_PIN_SECRET':
          return 'secret'
        case 'INVITATION_FROM_COMPANY_NUMBER':
          return '07964699'
        default:
          throw new Error()
      }
    },
  } as unknown as Env

  return {
    mockTransactionDb,
    mockDb,
    mockCompanyHouseEntity,
    mockCloudagent,
    mockEmail,
    mockNewInvite,
    mockFromInvite,
    mockEnv,
    mockLogger,
    args: [
      mockDb,
      mockCompanyHouseEntity,
      mockCloudagent,
      mockEmail,
      mockNewInvite,
      mockFromInvite,
      mockEnv,
      mockLogger,
    ] as const,
  }
}

export const toHTMLString = async (stream: Readable) => {
  const chunks: Uint8Array[] = []
  for await (const chunk of stream) {
    chunks.push(chunk as Uint8Array)
  }
  return Buffer.concat(chunks).toString('utf8')
}
