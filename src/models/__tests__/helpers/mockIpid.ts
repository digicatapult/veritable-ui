import { container } from 'tsyringe'
import { Dispatcher, getGlobalDispatcher, MockAgent, setGlobalDispatcher } from 'undici'
import { Env } from '../../../env/index.js'
import { ValidateResponse } from '../../ipid.js'
import {
  encryptedPayload,
  invalidCountryCode,
  invalidPublicKeyResponse,
  publicKeyResponse,
  validateResponse,
  validCountryCode,
} from '../fixtures/ipidFixtures.js'

const env: Env = container.resolve(Env)

export function withIpidMock(finalResponse: ValidateResponse = validateResponse) {
  let originalDispatcher: Dispatcher
  let agent: MockAgent

  beforeEach(function () {
    originalDispatcher = getGlobalDispatcher()
    agent = new MockAgent()
    setGlobalDispatcher(agent)

    const client = agent.get(env.get('IPID_API_URL'))

    client
      .intercept({
        path: `/validation/api/v1/public-key?country_code=${validCountryCode}`,
        method: 'GET',
      })
      .reply(200, publicKeyResponse)
      .persist()

    client
      .intercept({
        path: `/validation/api/v1/public-key?country_code=${invalidCountryCode}`,
        method: 'GET',
      })
      .reply(200, invalidPublicKeyResponse)
      .persist()

    client
      .intercept({
        path: '/utility/encrypt-payload',
        method: 'POST',
      })
      .reply(200, encryptedPayload)
      .persist()

    client
      .intercept({
        path: '/validation/api/v1/bank-account/validate',
        method: 'POST',
      })
      .reply(200, finalResponse)
      .persist()
  })

  afterEach(function () {
    setGlobalDispatcher(originalDispatcher)
  })
}
