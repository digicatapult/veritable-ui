import { container } from 'tsyringe'
import { Dispatcher, MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'undici'
import { Env } from '../../../env'
import {
  invalidCompanyNumber,
  noCompanyNumber,
  successResponse,
  validCompanyNumber,
} from '../fixtures/companyHouseFixtures'

const env = container.resolve(Env)

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
      .reply(404, {
        errors: [
          {
            type: 'ch:service',
            error: 'company-profile-not-found',
          },
        ],
      })
  })
  afterEach(function () {
    setGlobalDispatcher(originalDispatcher)
  })
}
