import sinon from 'sinon'
import VeritableCloudagent, { Credential } from '../../../models/veritableCloudagent.js'
import { AliceCredentials } from '../../../views/credentials/__tests__/fixtures.js'
import CredentialListTemplates from '../../../views/credentials/index.js'

function templateFake(templateName: string, ...args: unknown[]) {
  return Promise.resolve([templateName, args.join('-'), templateName].join('_'))
}

export const withConnectionMocks = () => {
  const templateMock = {
    listPage: (creds: Credential[]) =>
      templateFake('listCredentials', creds[0].role, creds[0].state, creds[0].protocolVersion),
  }

  const cloudagentMock = {
    getCredentials: sinon.stub().resolves(AliceCredentials),
  }

  return {
    templateMock,
    cloudagentMock,
    args: [
      templateMock as unknown as CredentialListTemplates,
      cloudagentMock as unknown as VeritableCloudagent,
    ] as const,
  }
}
