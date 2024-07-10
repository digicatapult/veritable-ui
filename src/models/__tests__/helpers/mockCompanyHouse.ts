import { container } from 'tsyringe'
import { Dispatcher, MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'undici'
import { Env } from '../../../env.js'
import {
  invalidCompanyNumber,
  noCompanyNumber,
  successResponse,
  validCompanyNumber,
} from '../fixtures/companyHouseFixtures.js'

const env: Env = container.resolve(Env)

export function withCompanyHouseMock() {
  let originalDispatcher: Dispatcher
  let agent: MockAgent
  beforeEach(function () {
    originalDispatcher = getGlobalDispatcher()
    agent = new MockAgent()
    setGlobalDispatcher(agent)

    const client = agent.get(env.get('COMPANY_HOUSE_API_URL'))
    client
      .intercept({
        path: `/company/${validCompanyNumber}`,
        method: 'GET',
      })
      .reply(200, successResponse)
      .persist()

    client
      .intercept({
        path: `/company/${noCompanyNumber}`,
        method: 'GET',
      })
      .reply(404, {})

    client
      .intercept({
        path: `/company/${invalidCompanyNumber}`,
        method: 'GET',
      })
      .reply(500, {})
  })
  afterEach(function () {
    setGlobalDispatcher(originalDispatcher)
  })
}
