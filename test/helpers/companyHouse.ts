import { container } from 'tsyringe'
import { Dispatcher, MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'undici'

import { Env } from '../../src/env.js'
import { successResponse, validCompanyNumber } from './fixtures.js'

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
  })
  afterEach(function () {
    setGlobalDispatcher(originalDispatcher)
  })
}
