import sinon from 'sinon'
import Database from '../../../models/db/index.js'
import VeritableCloudagent from '../../../models/veritableCloudagent.js'
import { default as CredentialListTemplates, type Credential } from '../../../views/credentials/index.js'
import { AliceCredentials, BobCredentials } from './fixtures.js'

function templateFake(templateName: string, ...args: unknown[]) {
  return Promise.resolve([templateName, args.join('-'), templateName].join('_'))
}

export const withConnectionMocks = () => {
  const templateMock = {
    listPage: sinon.stub().callsFake((creds: Credential[]) => {
      const vals = creds.map((cred) => [cred.role, cred.state, cred.companyName, cred.type]).flat()
      return templateFake('listCredentials', ...vals)
    }),
  }

  const dbMock = {
    get: sinon.stub().callsFake((_, args) => [
      {
        agent_connection_id: args.agent_connection_id,
        company_name:
          args.agent_connection_id === '65e99592-1989-4087-b7a3-ee50695b3457' ? 'CARE ONUS LTD' : 'DIGITAL CATAPULT',
      },
    ]),
  }

  const cloudagentMock = {
    getCredentials: sinon.stub().resolves([...BobCredentials, ...AliceCredentials]),
    getSchemaById: sinon.stub().resolves({ name: 'COMPANY_DETAILS' }),
  }

  return {
    templateMock,
    cloudagentMock,
    dbMock,
    args: [
      templateMock as unknown as CredentialListTemplates,
      cloudagentMock as unknown as VeritableCloudagent,
      dbMock as unknown as Database,
    ] as const,
  }
}
