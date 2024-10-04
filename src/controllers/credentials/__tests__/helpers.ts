import sinon from 'sinon'
import Database from '../../../models/db/index.js'
import VeritableCloudagent, { Credential } from '../../../models/veritableCloudagent.js'
import { AliceCredentials } from '../../../views/credentials/__tests__/fixtures.js'
import CredentialListTemplates from '../../../views/credentials/index.js'

function templateFake(templateName: string, ...args: unknown[]) {
  return Promise.resolve([templateName, args.join('-'), templateName].join('_'))
}

export const withConnectionMocks = () => {
  const templateMock = {
    listPage: (creds: Credential[]) => templateFake('listCredentials', creds[0].role, creds[0].state, creds[0].protocolVersion),
  }

  const dbMock = {
    get: sinon.stub().resolves(),
  }

  const cloudagentMock = {
    getCredentials: sinon.stub().resolves(AliceCredentials),
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
