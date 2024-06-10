import { container } from 'tsyringe'
import { Dispatcher, MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'undici'

import { Env } from '../../../env.js'

const env = container.resolve(Env)

export function withCloudagentMock(path: string, code: number, responseBody: any) {
  let originalDispatcher: Dispatcher
  let agent: MockAgent
  beforeEach(function () {
    originalDispatcher = getGlobalDispatcher()
    agent = new MockAgent()
    setGlobalDispatcher(agent)

    const client = agent.get(env.get('CLOUDAGENT_ADMIN_ORIGIN'))
    client
      .intercept({
        path,
        method: 'POST',
      })
      .reply(code, responseBody)
  })
  afterEach(function () {
    setGlobalDispatcher(originalDispatcher)
  })
}
