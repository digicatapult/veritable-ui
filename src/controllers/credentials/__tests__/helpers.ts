import sinon from 'sinon'
import Database from '../../../models/db/index.js'
import VeritableCloudagent, { Credential } from '../../../models/veritableCloudagent.js'
import { AliceCredentials, BobCredentials } from '../../../views/credentials/__tests__/fixtures.js'
import CredentialListTemplates from '../../../views/credentials/index.js'

function templateFake(templateName: string, ...args: unknown[]) {
  return Promise.resolve([templateName, args.join('-'), templateName].join('_'))
}

export const withConnectionMocks = () => {
  const templateMock = {
    listPage: sinon.stub().callsFake((creds: Credential[]) => {
      if (creds.length > 0)
        return templateFake('listCredentials', creds[0].role, creds[0].state, creds[0].protocolVersion)
      return templateFake('listCredentials', creds)
    }),
  }

  const dbMock = {
    get: sinon.stub().callsFake((_, args) => [{ agent_connection_id: args.agent_connection_id }]),
  }

  const cloudagentMock = {
    getCredentials: sinon.stub().resolves([...BobCredentials, ...AliceCredentials]),
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
