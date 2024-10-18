import { container } from 'tsyringe'
import { Dispatcher, MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'undici'

import { Env } from '../../src/env/index.js'
import { bob, charlie, successResponse, validCompanyNumber } from './fixtures.js'

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
        path: `/company/${bob.company_number}`,
        method: 'GET',
      })
      .reply(200, bob)
      .persist()

    client
      .intercept({
        path: `/company/${charlie.company_number}`,
        method: 'GET',
      })
      .reply(200, charlie)
      .persist()
  })
  afterEach(function () {
    setGlobalDispatcher(originalDispatcher)
  })
}
