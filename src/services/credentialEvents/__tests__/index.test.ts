import { describe, test } from 'mocha'

import { expect } from 'chai'
import sinon from 'sinon'
import CredentialEvents from '../index.js'
import { withCredentialEventsDepsMock } from './helpers/mocks.js'

function assertHandlerCallCount(
  companyDetailsMock: ReturnType<typeof withCredentialEventsDepsMock>['companyDetailsMock'],
  callCount: number
) {
  const totalCount =
    companyDetailsMock.handleProposalReceived.callCount +
    companyDetailsMock.handleOfferReceived.callCount +
    companyDetailsMock.handleRequestReceived.callCount +
    companyDetailsMock.handleCredentialReceived.callCount +
    companyDetailsMock.handleDone.callCount

  expect(totalCount).to.equal(callCount)
}

describe('credentialEvents', function () {
  let clock: sinon.SinonFakeTimers
  beforeEach(function () {
    clock = sinon.useFakeTimers()
  })
  afterEach(function () {
    clock?.restore()
  })

  async function prepareTest(credentialRecord: unknown, options: Parameters<typeof withCredentialEventsDepsMock>['0']) {
    const deps = withCredentialEventsDepsMock(options)
    const credentialEvents = new CredentialEvents(...deps.args)
    credentialEvents.start()

    deps.eventMock.emit('CredentialStateChanged', {
      payload: {
        credentialRecord,
      },
    })

    await clock.runAllAsync()

    return deps
  }

  test('valid proposal-received as issuer', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'proposal-received',
      role: 'issuer',
    }
    const options = {}

    const { companyDetailsMock, formatData } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 1)
    expect(companyDetailsMock.handleProposalReceived.callCount).equal(1)
    expect(companyDetailsMock.handleProposalReceived.firstCall.args).deep.equal([credentialRecord, formatData])
  })

  test('valid proposal-received as holder', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'proposal-received',
      role: 'holder',
    }
    const options = {}

    const { companyDetailsMock } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 0)
  })

  test('valid proposal-sent as issuer', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'proposal-sent',
      role: 'issuer',
    }
    const options = {}

    const { companyDetailsMock } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 0)
  })

  test('valid proposal-sent as holder', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'proposal-sent',
      role: 'holder',
    }
    const options = {}

    const { companyDetailsMock } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 0)
  })

  test('valid offer-received as holder', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'offer-received',
      role: 'holder',
    }
    const options = {}

    const { companyDetailsMock, formatData } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 1)
    expect(companyDetailsMock.handleOfferReceived.callCount).equal(1)
    expect(companyDetailsMock.handleOfferReceived.firstCall.args).deep.equal([credentialRecord, formatData])
  })

  test('valid offer-received as issuer', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'offer-received',
      role: 'issuer',
    }
    const options = {}

    const { companyDetailsMock } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 0)
  })

  test('valid request-received as issuer', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'request-received',
      role: 'issuer',
    }
    const options = {}

    const { companyDetailsMock, formatData } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 1)
    expect(companyDetailsMock.handleRequestReceived.callCount).equal(1)
    expect(companyDetailsMock.handleRequestReceived.firstCall.args).deep.equal([credentialRecord, formatData])
  })

  test('valid request-received as holder', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'request-received',
      role: 'holder',
    }
    const options = {}

    const { companyDetailsMock } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 0)
  })

  test('valid credential-received as holder', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'credential-received',
      role: 'holder',
    }
    const options = {}

    const { companyDetailsMock, formatData } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 1)
    expect(companyDetailsMock.handleCredentialReceived.callCount).equal(1)
    expect(companyDetailsMock.handleCredentialReceived.firstCall.args).deep.equal([credentialRecord, formatData])
  })

  test('valid credential-received as issuer', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'credential-received',
      role: 'issuer',
    }
    const options = {}

    const { companyDetailsMock } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 0)
  })

  test('valid done as issuer', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'done',
      role: 'issuer',
    }
    const options = {}

    const { companyDetailsMock, formatData } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 1)
    expect(companyDetailsMock.handleDone.callCount).equal(1)
    expect(companyDetailsMock.handleDone.firstCall.args).deep.equal([credentialRecord, formatData])
  })

  test('valid done as holder', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'done',
      role: 'holder',
    }
    const options = {}

    const { companyDetailsMock, formatData } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 1)
    expect(companyDetailsMock.handleDone.callCount).equal(1)
    expect(companyDetailsMock.handleDone.firstCall.args).deep.equal([credentialRecord, formatData])
  })

  const ignoredEvents = ['proposal-sent', 'offer-sent', 'declined', 'request-sent', 'credential-issued', 'abandoned']
  for (const event of ignoredEvents) {
    test(`valid ${event} as issuer`, async function () {
      const credentialRecord = {
        protocolVersion: 'v2',
        id: 'record-id',
        state: event,
        role: 'issuer',
      }
      const options = {}

      const { companyDetailsMock } = await prepareTest(credentialRecord, options)

      assertHandlerCallCount(companyDetailsMock, 0)
    })

    test(`valid ${event} as holder`, async function () {
      const credentialRecord = {
        protocolVersion: 'v2',
        id: 'record-id',
        state: event,
        role: 'holder',
      }
      const options = {}

      const { companyDetailsMock } = await prepareTest(credentialRecord, options)

      assertHandlerCallCount(companyDetailsMock, 0)
    })
  }

  test('non-matching proposal (protocolVersion) as issuer', async function () {
    const credentialRecord = {
      protocolVersion: 'v1',
      id: 'record-id',
      state: 'proposal-received',
      role: 'issuer',
    }
    const options = {}

    const { companyDetailsMock } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 0)
  })

  test('non-matching proposal (schema_name) as issuer', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'proposal-received',
      role: 'issuer',
    }
    const options = {
      formatDataResponse: {
        proposal: {
          anoncreds: { schema_name: 'OTHER', schema_version: '1.0.0' },
        },
      },
    }

    const { companyDetailsMock } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 0)
  })

  test('non-matching proposal (schema_version) as issuer', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'proposal-received',
      role: 'issuer',
    }
    const options = {
      formatDataResponse: {
        proposal: {
          anoncreds: { schema_name: 'COMPANY_DETAILS', schema_version: '2.0.0' },
        },
      },
    }

    const { companyDetailsMock } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 0)
  })

  test('non-matching proposal (schema_version) as issuer', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'proposal-received',
      role: 'issuer',
    }
    const options = {
      formatDataResponse: {
        proposal: {
          anoncreds: { schema_name: 'COMPANY_DETAILS', schema_version: '2.0.0' },
        },
      },
    }

    const { companyDetailsMock } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 0)
  })

  test('invalid (no offer) offer-received as holder', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'offer-received',
      role: 'holder',
    }
    const options = {
      formatDataResponse: {
        proposal: {
          anoncreds: { schema_name: 'COMPANY_DETAILS', schema_version: '1.0.0' },
        },
      },
    }

    const { companyDetailsMock } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 0)
  })

  test('invalid (no offer) request-received as issuer', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'request-received',
      role: 'issuer',
    }
    const options = {
      formatDataResponse: {
        proposal: {
          anoncreds: { schema_name: 'COMPANY_DETAILS', schema_version: '1.0.0' },
        },
      },
    }

    const { companyDetailsMock } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 0)
  })

  test('invalid (no offer) credential-received as holder', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'credential-received',
      role: 'holder',
    }
    const options = {
      formatDataResponse: {
        proposal: {
          anoncreds: { schema_name: 'COMPANY_DETAILS', schema_version: '1.0.0' },
        },
      },
    }

    const { companyDetailsMock } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 0)
  })

  test('invalid (no offer) done as issuer', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'done',
      role: 'issuer',
    }
    const options = {
      formatDataResponse: {
        proposal: {
          anoncreds: { schema_name: 'COMPANY_DETAILS', schema_version: '1.0.0' },
        },
      },
    }

    const { companyDetailsMock } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 0)
  })

  test('invalid (no offer) done as holder', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'done',
      role: 'holder',
    }
    const options = {
      formatDataResponse: {
        proposal: {
          anoncreds: { schema_name: 'COMPANY_DETAILS', schema_version: '1.0.0' },
        },
      },
    }

    const { companyDetailsMock } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 0)
  })

  test('invalid (schema_name) offer-received as holder', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'offer-received',
      role: 'holder',
    }
    const options = {
      schemaResponse: {
        name: 'OTHER',
        version: '1.0.0',
      },
    }

    const { companyDetailsMock } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 0)
  })

  test('invalid (schema_name) request-received as issuer', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'request-received',
      role: 'issuer',
    }
    const options = {
      schemaResponse: {
        name: 'OTHER',
        version: '1.0.0',
      },
    }

    const { companyDetailsMock } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 0)
  })

  test('invalid (schema_name) credential-received as holder', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'credential-received',
      role: 'holder',
    }
    const options = {
      schemaResponse: {
        name: 'OTHER',
        version: '1.0.0',
      },
    }

    const { companyDetailsMock } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 0)
  })

  test('invalid (schema_name) done as issuer', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'done',
      role: 'issuer',
    }
    const options = {
      schemaResponse: {
        name: 'OTHER',
        version: '1.0.0',
      },
    }

    const { companyDetailsMock } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 0)
  })

  test('invalid (schema_name) done as holder', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'done',
      role: 'holder',
    }
    const options = {
      schemaResponse: {
        name: 'OTHER',
        version: '1.0.0',
      },
    }

    const { companyDetailsMock } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 0)
  })

  test('invalid (schema_version) offer-received as holder', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'offer-received',
      role: 'holder',
    }
    const options = {
      schemaResponse: {
        name: 'COMPANY_DETAILS',
        version: '2.0.0',
      },
    }

    const { companyDetailsMock } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 0)
  })

  test('invalid (schema_version) request-received as issuer', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'request-received',
      role: 'issuer',
    }
    const options = {
      schemaResponse: {
        name: 'COMPANY_DETAILS',
        version: '2.0.0',
      },
    }

    const { companyDetailsMock } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 0)
  })

  test('invalid (schema_version) credential-received as holder', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'credential-received',
      role: 'holder',
    }
    const options = {
      schemaResponse: {
        name: 'COMPANY_DETAILS',
        version: '2.0.0',
      },
    }

    const { companyDetailsMock } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 0)
  })

  test('invalid (schema_version) done as issuer', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'done',
      role: 'issuer',
    }
    const options = {
      schemaResponse: {
        name: 'COMPANY_DETAILS',
        version: '2.0.0',
      },
    }

    const { companyDetailsMock } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 0)
  })

  test('invalid (schema_version) done as holder', async function () {
    const credentialRecord = {
      protocolVersion: 'v2',
      id: 'record-id',
      state: 'done',
      role: 'holder',
    }
    const options = {
      schemaResponse: {
        name: 'COMPANY_DETAILS',
        version: '2.0.0',
      },
    }

    const { companyDetailsMock } = await prepareTest(credentialRecord, options)

    assertHandlerCallCount(companyDetailsMock, 0)
  })
})
