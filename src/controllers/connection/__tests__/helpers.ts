import { Readable } from 'node:stream'
import { pino } from 'pino'

import { Env } from '../../../env.js'
import CompanyHouseEntity from '../../../models/companyHouseEntity.js'
import Database from '../../../models/db/index.js'
import { ConnectionRow } from '../../../models/db/types.js'
import EmailService from '../../../models/emailService/index.js'
import VeritableCloudagent from '../../../models/veritableCloudagent.js'
import ConnectionTemplates from '../../../views/connection.js'
import NewConnectionTemplates, { CompanyProfileText, FormStage } from '../../../views/newConnection.js'
import { notFoundCompanyNumber, validCompanyMap, validCompanyNumber, validExistingCompanyNumber } from './fixtures.js'

function templateFake(templateName: string, ...args: any[]) {
  return Promise.resolve([templateName, args.join('-'), templateName].join('_'))
}

export const withConnectionMocks = () => {
  const templateMock = {
    listPage: (connections: ConnectionRow[]) =>
      templateFake('list', connections[0].company_name, connections[0].status),
  } as ConnectionTemplates
  const mockLogger = pino({ level: 'silent' })
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
  const mockLogger = pino({ level: 'silent' })
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
        invitation: {
          id: `id-${companyName}`,
        },
        invitationUrl: `url-${companyName}`,
      }
    },
  } as unknown as VeritableCloudagent
  const mockEmail = {
    sendMail: () => {},
  } as unknown as EmailService
  const mockNewConnection = {
    formPage: (targetBox: CompanyProfileText, formStage: FormStage) =>
      templateFake('formPage', targetBox.status, formStage),
    companyFormInput: ({ targetBox, formStage, email, companyNumber }: any) =>
      templateFake(
        'companyFormInput',
        targetBox.status,
        targetBox.company?.company_name || '',
        targetBox.errorMessage || '',
        formStage,
        email,
        companyNumber
      ),
  } as unknown as NewConnectionTemplates
  const mockEnv = {
    get: (name: string) => {
      if (name === 'INVITATION_PIN_SECRET') {
        return 'secret'
      }
      throw new Error()
    },
  } as unknown as Env

  return {
    mockLogger,
    mockTransactionDb,
    mockDb,
    mockCompanyHouseEntity,
    mockCloudagent,
    mockEmail,
    mockNewConnection,
    mockEnv,
  }
}

export const toHTMLString = async (stream: Readable) => {
  const chunks: Uint8Array[] = []
  for await (const chunk of stream) {
    chunks.push(chunk as Uint8Array)
  }
  return Buffer.concat(chunks).toString('utf8')
}
