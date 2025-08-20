import { container } from 'tsyringe'
import { Dispatcher, MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'undici'
import { Env } from '../../../env/index.js'
import {
  gbCountryCode,
  invalidCompanyNumber,
  noCompanyNumber,
  successResponse,
  validCompanyNumber,
} from '../fixtures/openCorporatesFixtures.js'

const env: Env = container.resolve(Env)

export function withOpenCorporatesMock() {
  let originalDispatcher: Dispatcher
  let agent: MockAgent
  beforeEach(function () {
    originalDispatcher = getGlobalDispatcher()
    agent = new MockAgent()
    setGlobalDispatcher(agent)
    const client = agent.get(env.get('OPEN_CORPORATES_API_URL'))
    console.log(env.get('OPEN_CORPORATES_API_URL'))
    client
      .intercept({
        path: `/companies/${gbCountryCode.toLowerCase()}/${validCompanyNumber}?api_token=test-key`,
        method: 'GET',
      })
      .reply(200, successResponse)
      .persist()

    client
      .intercept({
        path: `/companies/${gbCountryCode.toLowerCase()}/${noCompanyNumber}?api_token=test-key`,
        method: 'GET',
      })
      .reply(200, [])

    client
      .intercept({
        path: `/companies/${gbCountryCode.toLowerCase()}/${invalidCompanyNumber}?api_token=test-key`,
        method: 'GET',
      })
      .reply(404, {})
  })
  afterEach(function () {
    setGlobalDispatcher(originalDispatcher)
  })
}
