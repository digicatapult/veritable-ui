import { container } from 'tsyringe'
import { Dispatcher, MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'undici'

import { Env } from '../../../env/index.js'

const env = container.resolve(Env)

export function withCloudagentMock(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  code: number,
  responseBody: object | string
) {
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
        method,
      })
      .reply(code, responseBody)
  })
  afterEach(function () {
    setGlobalDispatcher(originalDispatcher)
  })
}
