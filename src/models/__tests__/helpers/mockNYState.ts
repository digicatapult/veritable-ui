import { container } from 'tsyringe'
import { Dispatcher, MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'undici'
import { Env } from '../../../env/index.js'
import {
  invalidCompanyNumber,
  noCompanyNumber,
  successResponse,
  validCompanyNumber,
} from '../fixtures/nyStateFixtures.js'

const env: Env = container.resolve(Env)

export function withNYStateMock() {
  let originalDispatcher: Dispatcher
  let agent: MockAgent
  beforeEach(function () {
    originalDispatcher = getGlobalDispatcher()
    agent = new MockAgent()
    setGlobalDispatcher(agent)

    const client = agent.get(env.get('NY_STATE_API_URL'))
    client
      .intercept({
        path: `/?dos_id=${validCompanyNumber}`,
        method: 'GET',
      })
      .reply(200, successResponse)
      .persist()

    client
      .intercept({
        path: `/?dos_id=${noCompanyNumber}`,
        method: 'GET',
      })
      .reply(200, [])

    client
      .intercept({
        path: `/?dos_id=${invalidCompanyNumber}`,
        method: 'GET',
      })
      .reply(500, {})
  })
  afterEach(function () {
    setGlobalDispatcher(originalDispatcher)
  })
}
