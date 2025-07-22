import argon2 from 'argon2'
import { expect } from 'chai'
import { describe, test } from 'mocha'
import sinon from 'sinon'

import CompanyDetailsV1Handler from '../companyDetailsV1.js'
import { invitePinSecret, withCompanyDetailsDepsMock } from './helpers/mocks.js'

describe('companyDetailsV1', function () {
  describe('handleProposalReceived', function () {
    let clock: sinon.SinonFakeTimers
    beforeEach(function () {
      clock = sinon.useFakeTimers(5)
    })
    afterEach(function () {
      clock?.restore()
    })

    test('happy path (unverified)', async function () {
      const { args, cloudagentMock, dbMock } = withCompanyDetailsDepsMock({})
      const companyDetails = new CompanyDetailsV1Handler(...args)

      await companyDetails.handleProposalReceived(
        {
          id: 'credential-id',
          connectionId: 'agent-connection-id',
          protocolVersion: 'v2',
          role: 'issuer',
          state: 'proposal-received',
        },
        {
          proposalAttributes: [
            {
              name: 'company_name',
              value: 'NAME',
            },
            {
              name: 'company_number',
              value: 'NUMBER',
            },
            {
              name: 'pin',
              value: '123456',
            },
          ],
        }
      )

      expect(dbMock.get.callCount).equal(2)
      expect(dbMock.get.firstCall.args).deep.equal(['connection', { agent_connection_id: 'agent-connection-id' }])
      expect(dbMock.get.secondCall.args).deep.equal([
        'connection_invite',
        { connection_id: 'connection-id', validity: 'valid' },
      ])
      expect(dbMock.increment.callCount).to.equal(1)
      expect(dbMock.increment.firstCall.args).to.deep.equal([
        'connection',
        'pin_attempt_count',
        { id: 'connection-id' },
      ])
      expect(dbMock.update.callCount).to.equal(0)

      const stub = cloudagentMock.acceptProposal
      expect(stub.callCount).to.equal(1)
      expect(stub.firstCall.args).to.deep.equal([
        'credential-id',
        {
          credentialDefinitionId: 'credential-definition-id',
          attributes: [
            {
              name: 'company_name',
              value: 'NAME',
            },
            {
              name: 'company_number',
              value: 'NUMBER',
            },
          ],
        },
      ])
    })

    test('happy path (verified_us)', async function () {
      const { args, cloudagentMock, dbMock } = withCompanyDetailsDepsMock({
        dbGetConnection: [
          {
            status: 'verified_us',
            id: 'connection-id',
            company_name: 'NAME',
            company_number: 'NUMBER',
          },
        ],
      })
      const companyDetails = new CompanyDetailsV1Handler(...args)

      await companyDetails.handleProposalReceived(
        {
          id: 'credential-id',
          connectionId: 'agent-connection-id',
          protocolVersion: 'v2',
          role: 'issuer',
          state: 'proposal-received',
        },
        {
          proposalAttributes: [
            {
              name: 'company_name',
              value: 'NAME',
            },
            {
              name: 'company_number',
              value: 'NUMBER',
            },
            {
              name: 'pin',
              value: '123456',
            },
          ],
        }
      )

      expect(dbMock.get.callCount).equal(2)
      expect(dbMock.get.firstCall.args).deep.equal(['connection', { agent_connection_id: 'agent-connection-id' }])
      expect(dbMock.get.secondCall.args).deep.equal([
        'connection_invite',
        { connection_id: 'connection-id', validity: 'valid' },
      ])
      expect(dbMock.increment.callCount).to.equal(1)
      expect(dbMock.increment.firstCall.args).to.deep.equal([
        'connection',
        'pin_attempt_count',
        { id: 'connection-id' },
      ])
      expect(dbMock.update.callCount).to.equal(0)

      const stub = cloudagentMock.acceptProposal
      expect(stub.callCount).to.equal(1)
      expect(stub.firstCall.args).to.deep.equal([
        'credential-id',
        {
          credentialDefinitionId: 'credential-definition-id',
          attributes: [
            {
              name: 'company_name',
              value: 'NAME',
            },
            {
              name: 'company_number',
              value: 'NUMBER',
            },
          ],
        },
      ])
    })

    test('missing company_name', async function () {
      const { args, cloudagentMock } = withCompanyDetailsDepsMock({})
      const companyDetails = new CompanyDetailsV1Handler(...args)

      await companyDetails.handleProposalReceived(
        {
          id: 'credential-id',
          connectionId: 'agent-connection-id',
          protocolVersion: 'v2',
          role: 'issuer',
          state: 'proposal-received',
        },
        {
          proposalAttributes: [
            {
              name: 'company_number',
              value: 'NUMBER',
            },
            {
              name: 'pin',
              value: '123456',
            },
          ],
        }
      )

      const stub = cloudagentMock.acceptProposal
      expect(stub.callCount).to.equal(0)
    })

    test('missing company_number', async function () {
      const { args, cloudagentMock } = withCompanyDetailsDepsMock({})
      const companyDetails = new CompanyDetailsV1Handler(...args)

      await companyDetails.handleProposalReceived(
        {
          id: 'credential-id',
          connectionId: 'agent-connection-id',
          protocolVersion: 'v2',
          role: 'issuer',
          state: 'proposal-received',
        },
        {
          proposalAttributes: [
            {
              name: 'company_name',
              value: 'NAME',
            },
            {
              name: 'pin',
              value: '123456',
            },
          ],
        }
      )

      const stub = cloudagentMock.acceptProposal
      expect(stub.callCount).to.equal(0)
    })

    test('missing pin', async function () {
      const { args, cloudagentMock } = withCompanyDetailsDepsMock({})
      const companyDetails = new CompanyDetailsV1Handler(...args)

      await companyDetails.handleProposalReceived(
        {
          id: 'credential-id',
          connectionId: 'agent-connection-id',
          protocolVersion: 'v2',
          role: 'issuer',
          state: 'proposal-received',
        },
        {
          proposalAttributes: [
            {
              name: 'company_name',
              value: 'NAME',
            },
            {
              name: 'company_number',
              value: 'NUMBER',
            },
          ],
        }
      )

      const stub = cloudagentMock.acceptProposal
      expect(stub.callCount).to.equal(0)
    })

    test('no connection', async function () {
      const { args, cloudagentMock } = withCompanyDetailsDepsMock({ dbGetConnection: [] })
      const companyDetails = new CompanyDetailsV1Handler(...args)

      let error: Error | null = null
      try {
        await companyDetails.handleProposalReceived(
          {
            id: 'credential-id',
            connectionId: 'agent-connection-id',
            protocolVersion: 'v2',
            role: 'issuer',
            state: 'proposal-received',
          },
          {
            proposalAttributes: [
              {
                name: 'company_name',
                value: 'NAME',
              },
              {
                name: 'company_number',
                value: 'NUMBER',
              },
              {
                name: 'pin',
                value: '123456',
              },
            ],
          }
        )
      } catch (err) {
        if (err instanceof Error) {
          error = err
        }
      }

      expect(error).instanceOf(Error)
      const stub = cloudagentMock.acceptProposal
      expect(stub.callCount).to.equal(0)
    })

    for (const status of ['disconnected', 'pending', 'verified_both', 'verified_them']) {
      test(`invalid connection_state (${status})`, async function () {
        const { args, cloudagentMock } = withCompanyDetailsDepsMock({
          dbGetConnection: [
            {
              status: status,
              id: 'connection-id',
              company_name: 'NAME',
              company_number: 'NUMBER',
            },
          ],
        })
        const companyDetails = new CompanyDetailsV1Handler(...args)

        await companyDetails.handleProposalReceived(
          {
            id: 'credential-id',
            connectionId: 'agent-connection-id',
            protocolVersion: 'v2',
            role: 'issuer',
            state: 'proposal-received',
          },
          {
            proposalAttributes: [
              {
                name: 'company_name',
                value: 'NAME',
              },
              {
                name: 'company_number',
                value: 'NUMBER',
              },
              {
                name: 'pin',
                value: '123456',
              },
            ],
          }
        )

        const stub = cloudagentMock.acceptProposal
        expect(stub.callCount).to.equal(0)
      })
    }

    test(`invalid company_name`, async function () {
      const { args, cloudagentMock } = withCompanyDetailsDepsMock({})
      const companyDetails = new CompanyDetailsV1Handler(...args)

      await companyDetails.handleProposalReceived(
        {
          id: 'credential-id',
          connectionId: 'agent-connection-id',
          protocolVersion: 'v2',
          role: 'issuer',
          state: 'proposal-received',
        },
        {
          proposalAttributes: [
            {
              name: 'company_name',
              value: 'INVALID',
            },
            {
              name: 'company_number',
              value: 'NUMBER',
            },
            {
              name: 'pin',
              value: '123456',
            },
          ],
        }
      )

      const stub = cloudagentMock.acceptProposal
      expect(stub.callCount).to.equal(0)
    })

    test(`invalid company_number`, async function () {
      const { args, cloudagentMock } = withCompanyDetailsDepsMock({})
      const companyDetails = new CompanyDetailsV1Handler(...args)

      await companyDetails.handleProposalReceived(
        {
          id: 'credential-id',
          connectionId: 'agent-connection-id',
          protocolVersion: 'v2',
          role: 'issuer',
          state: 'proposal-received',
        },
        {
          proposalAttributes: [
            {
              name: 'company_name',
              value: 'NAME',
            },
            {
              name: 'company_number',
              value: 'INVALID',
            },
            {
              name: 'pin',
              value: '123456',
            },
          ],
        }
      )

      const stub = cloudagentMock.acceptProposal
      expect(stub.callCount).to.equal(0)
    })

    test(`pin attempt count exceeded`, async function () {
      const { args, cloudagentMock, dbMock } = withCompanyDetailsDepsMock({ dbIncrement: [{ pin_attempt_count: 6 }] })
      const companyDetails = new CompanyDetailsV1Handler(...args)

      await companyDetails.handleProposalReceived(
        {
          id: 'credential-id',
          connectionId: 'agent-connection-id',
          protocolVersion: 'v2',
          role: 'issuer',
          state: 'proposal-received',
        },
        {
          proposalAttributes: [
            {
              name: 'company_name',
              value: 'NAME',
            },
            {
              name: 'company_number',
              value: 'NUMBER',
            },
            {
              name: 'pin',
              value: '123456',
            },
          ],
        }
      )

      expect(dbMock.increment.callCount).to.equal(1)
      expect(dbMock.increment.firstCall.args).to.deep.equal([
        'connection',
        'pin_attempt_count',
        { id: 'connection-id' },
      ])
      expect(dbMock.update.callCount).to.equal(2)
      expect(dbMock.update.firstCall.args).to.deep.equal([
        'connection_invite',
        { connection_id: 'connection-id' },
        { validity: 'too_many_attempts' },
      ])
      expect(dbMock.update.secondCall.args).to.deep.equal([
        'connection',
        { id: 'connection-id' },
        { pin_attempt_count: 0 },
      ])

      const stub = cloudagentMock.acceptProposal
      expect(stub.callCount).to.equal(0)

      const problemReportPin: { message: string; pinTries: number } = {
        message: `PIN verification attempt count exceeded for connection connection-id`,
        pinTries: -1,
      }
      const stub2 = cloudagentMock.sendProblemReport
      expect(stub2.calledOnce)
      expect(stub2.calledWith('credential-id', JSON.stringify(problemReportPin))).to.equal(true)
    })

    test(`invalid pin`, async function () {
      const { args, cloudagentMock } = withCompanyDetailsDepsMock({})
      const companyDetails = new CompanyDetailsV1Handler(...args)

      await companyDetails.handleProposalReceived(
        {
          id: 'credential-id',
          connectionId: 'agent-connection-id',
          protocolVersion: 'v2',
          role: 'issuer',
          state: 'proposal-received',
        },
        {
          proposalAttributes: [
            {
              name: 'company_name',
              value: 'NAME',
            },
            {
              name: 'company_number',
              value: 'NUMBER',
            },
            {
              name: 'pin',
              value: 'INVALID',
            },
          ],
        }
      )

      const problemReportPin: { message: string; pinTries: number } = {
        message: `Invalid pin detected in credential proposal for connection connection-id`,
        pinTries: 4,
      }

      const stub = cloudagentMock.acceptProposal
      const stub2 = cloudagentMock.sendProblemReport
      expect(stub.callCount).to.equal(0)
      expect(stub2.calledOnce)
      expect(stub2.calledWith('credential-id', JSON.stringify(problemReportPin))).to.equal(true)
    })

    test(`invalid pin (expired)`, async function () {
      const { args, cloudagentMock, dbMock } = withCompanyDetailsDepsMock({
        dbGetConnectionInvites: [
          {
            id: 'invite-id',
            pin_hash: await argon2.hash('123456', { secret: invitePinSecret }),
            expires_at: new Date(0),
          },
        ],
      })
      const companyDetails = new CompanyDetailsV1Handler(...args)

      await companyDetails.handleProposalReceived(
        {
          id: 'credential-id',
          connectionId: 'agent-connection-id',
          protocolVersion: 'v2',
          role: 'issuer',
          state: 'proposal-received',
        },
        {
          proposalAttributes: [
            {
              name: 'company_name',
              value: 'NAME',
            },
            {
              name: 'company_number',
              value: 'NUMBER',
            },
            {
              name: 'pin',
              value: '123456',
            },
          ],
        }
      )

      expect(dbMock.update.callCount).to.equal(1)
      expect(dbMock.update.firstCall.args).to.deep.equal([
        'connection_invite',
        { id: 'invite-id' },
        { validity: 'expired' },
      ])

      const stub = cloudagentMock.acceptProposal
      expect(stub.callCount).to.equal(0)
    })

    test(`multiple pins all invalid`, async function () {
      const { args, cloudagentMock } = withCompanyDetailsDepsMock({
        dbGetConnectionInvites: [
          {
            pin_hash: await argon2.hash('123456', { secret: invitePinSecret }),
            expires_at: new Date(0),
          },
          {
            pin_hash: await argon2.hash('78910', { secret: invitePinSecret }),
            expires_at: new Date(10),
          },
        ],
      })
      const companyDetails = new CompanyDetailsV1Handler(...args)

      await companyDetails.handleProposalReceived(
        {
          id: 'credential-id',
          connectionId: 'agent-connection-id',
          protocolVersion: 'v2',
          role: 'issuer',
          state: 'proposal-received',
        },
        {
          proposalAttributes: [
            {
              name: 'company_name',
              value: 'NAME',
            },
            {
              name: 'company_number',
              value: 'NUMBER',
            },
            {
              name: 'pin',
              value: '123456',
            },
          ],
        }
      )

      const stub = cloudagentMock.acceptProposal
      expect(stub.callCount).to.equal(0)
    })

    test(`multiple pins one valid`, async function () {
      const { args, cloudagentMock } = withCompanyDetailsDepsMock({
        dbGetConnectionInvites: [
          {
            pin_hash: await argon2.hash('78910', { secret: invitePinSecret }),
            expires_at: new Date(0),
          },
          {
            pin_hash: await argon2.hash('123456', { secret: invitePinSecret }),
            expires_at: new Date(10),
          },
        ],
      })
      const companyDetails = new CompanyDetailsV1Handler(...args)

      await companyDetails.handleProposalReceived(
        {
          id: 'credential-id',
          connectionId: 'agent-connection-id',
          protocolVersion: 'v2',
          role: 'issuer',
          state: 'proposal-received',
        },
        {
          proposalAttributes: [
            {
              name: 'company_name',
              value: 'NAME',
            },
            {
              name: 'company_number',
              value: 'NUMBER',
            },
            {
              name: 'pin',
              value: '123456',
            },
          ],
        }
      )

      const stub = cloudagentMock.acceptProposal
      expect(stub.callCount).to.equal(1)
    })
  })

  const cases: {
    testMethod: 'handleOfferReceived' | 'handleRequestReceived' | 'handleCredentialReceived'
    expectedMethod: 'acceptCredentialOffer' | 'acceptCredentialRequest' | 'acceptCredential'
    role: 'holder' | 'issuer'
    state: 'offer-received' | 'request-received' | 'credential-received'
  }[] = [
    {
      testMethod: 'handleOfferReceived',
      expectedMethod: 'acceptCredentialOffer',
      role: 'holder',
      state: 'offer-received',
    },
    {
      testMethod: 'handleRequestReceived',
      expectedMethod: 'acceptCredentialRequest',
      role: 'issuer',
      state: 'request-received',
    },
    {
      testMethod: 'handleCredentialReceived',
      expectedMethod: 'acceptCredential',
      role: 'holder',
      state: 'credential-received',
    },
  ]

  for (const { testMethod, expectedMethod, state, role } of cases) {
    describe(testMethod, function () {
      test('happy path', async function () {
        const { args, cloudagentMock } = withCompanyDetailsDepsMock({})
        const companyDetails = new CompanyDetailsV1Handler(...args)

        await companyDetails[testMethod](
          {
            id: 'credential-id',
            connectionId: 'connection-id',
            protocolVersion: 'v2',
            role,
            state,
          },
          {
            proposalAttributes: [
              {
                name: 'company_name',
                value: 'NAME',
              },
              {
                name: 'company_number',
                value: 'NUMBER',
              },
              {
                name: 'pin',
                value: '123456',
              },
            ],
            offerAttributes: [
              {
                name: 'company_name',
                value: 'NAME',
              },
              {
                name: 'company_number',
                value: 'NUMBER',
              },
            ],
          }
        )

        const stub = cloudagentMock[expectedMethod]
        expect(stub.callCount).to.equal(1)
        expect(stub.firstCall.args).to.deep.equal(['credential-id'])
      })

      test('missing proposal prop (company name)', async function () {
        const { args, cloudagentMock } = withCompanyDetailsDepsMock({})
        const companyDetails = new CompanyDetailsV1Handler(...args)

        await companyDetails[testMethod](
          {
            id: 'credential-id',
            connectionId: 'connection-id',
            protocolVersion: 'v2',
            role,
            state,
          },
          {
            proposalAttributes: [
              {
                name: 'company_number',
                value: 'NUMBER',
              },
              {
                name: 'pin',
                value: '123456',
              },
            ],
            offerAttributes: [
              {
                name: 'company_name',
                value: 'NAME',
              },
              {
                name: 'company_number',
                value: 'NUMBER',
              },
            ],
          }
        )

        const stub = cloudagentMock[expectedMethod]
        expect(stub.callCount).to.equal(0)
      })

      test('missing proposal prop (company number)', async function () {
        const { args, cloudagentMock } = withCompanyDetailsDepsMock({})
        const companyDetails = new CompanyDetailsV1Handler(...args)

        await companyDetails[testMethod](
          {
            id: 'credential-id',
            connectionId: 'connection-id',
            protocolVersion: 'v2',
            role,
            state,
          },
          {
            proposalAttributes: [
              {
                name: 'company_name',
                value: 'NAME',
              },
              {
                name: 'pin',
                value: '123456',
              },
            ],
            offerAttributes: [
              {
                name: 'company_name',
                value: 'NAME',
              },
              {
                name: 'company_number',
                value: 'NUMBER',
              },
            ],
          }
        )

        const stub = cloudagentMock[expectedMethod]
        expect(stub.callCount).to.equal(0)
      })

      test('missing offer prop (company name)', async function () {
        const { args, cloudagentMock } = withCompanyDetailsDepsMock({})
        const companyDetails = new CompanyDetailsV1Handler(...args)

        await companyDetails[testMethod](
          {
            id: 'credential-id',
            connectionId: 'connection-id',
            protocolVersion: 'v2',
            role,
            state,
          },
          {
            proposalAttributes: [
              {
                name: 'company_name',
                value: 'NAME',
              },
              {
                name: 'company_number',
                value: 'NUMBER',
              },
              {
                name: 'pin',
                value: '123456',
              },
            ],
            offerAttributes: [
              {
                name: 'company_number',
                value: 'NUMBER',
              },
            ],
          }
        )

        const stub = cloudagentMock[expectedMethod]
        expect(stub.callCount).to.equal(0)
      })

      test('missing offer prop (company number)', async function () {
        const { args, cloudagentMock } = withCompanyDetailsDepsMock({})
        const companyDetails = new CompanyDetailsV1Handler(...args)

        await companyDetails[testMethod](
          {
            id: 'credential-id',
            connectionId: 'connection-id',
            protocolVersion: 'v2',
            role,
            state,
          },
          {
            proposalAttributes: [
              {
                name: 'company_name',
                value: 'NAME',
              },
              {
                name: 'company_number',
                value: 'NUMBER',
              },
              {
                name: 'pin',
                value: '123456',
              },
            ],
            offerAttributes: [
              {
                name: 'company_name',
                value: 'NAME',
              },
            ],
          }
        )

        const stub = cloudagentMock[expectedMethod]
        expect(stub.callCount).to.equal(0)
      })

      test('inconsistent prop (company name)', async function () {
        const { args, cloudagentMock } = withCompanyDetailsDepsMock({})
        const companyDetails = new CompanyDetailsV1Handler(...args)

        await companyDetails[testMethod](
          {
            id: 'credential-id',
            connectionId: 'connection-id',
            protocolVersion: 'v2',
            role,
            state,
          },
          {
            proposalAttributes: [
              {
                name: 'company_name',
                value: 'NAME',
              },
              {
                name: 'company_number',
                value: 'NUMBER',
              },
              {
                name: 'pin',
                value: '123456',
              },
            ],
            offerAttributes: [
              {
                name: 'company_name',
                value: 'INVALID',
              },
              {
                name: 'company_number',
                value: 'NUMBER',
              },
            ],
          }
        )

        const stub = cloudagentMock[expectedMethod]
        expect(stub.callCount).to.equal(0)
      })

      test('inconsistent prop (company number)', async function () {
        const { args, cloudagentMock } = withCompanyDetailsDepsMock({})
        const companyDetails = new CompanyDetailsV1Handler(...args)

        await companyDetails[testMethod](
          {
            id: 'credential-id',
            connectionId: 'connection-id',
            protocolVersion: 'v2',
            role,
            state,
          },
          {
            proposalAttributes: [
              {
                name: 'company_name',
                value: 'NAME',
              },
              {
                name: 'company_number',
                value: 'NUMBER',
              },
              {
                name: 'pin',
                value: '123456',
              },
            ],
            offerAttributes: [
              {
                name: 'company_name',
                value: 'NAME',
              },
              {
                name: 'company_number',
                value: 'INVALID',
              },
            ],
          }
        )

        const stub = cloudagentMock[expectedMethod]
        expect(stub.callCount).to.equal(0)
      })
    })
  }

  describe('handleDone', async function () {
    test('happy path unverified as holder', async function () {
      const { args, dbTransactionMock } = withCompanyDetailsDepsMock({})
      const companyDetails = new CompanyDetailsV1Handler(...args)

      await companyDetails.handleDone({
        id: 'credential-id',
        connectionId: 'connection-id',
        protocolVersion: 'v2',
        role: 'holder',
        state: 'done',
      })

      const stub = dbTransactionMock.update
      expect(stub.callCount).to.equal(1)
      expect(stub.firstCall.args).to.deep.equal(['connection', { id: `connection-id` }, { status: 'verified_us' }])
    })

    test('happy path unverified as issuer', async function () {
      const { args, dbTransactionMock } = withCompanyDetailsDepsMock({})
      const companyDetails = new CompanyDetailsV1Handler(...args)

      await companyDetails.handleDone({
        id: 'credential-id',
        connectionId: 'connection-id',
        protocolVersion: 'v2',
        role: 'issuer',
        state: 'done',
      })

      const stub = dbTransactionMock.update
      expect(stub.callCount).to.equal(2)
      expect(stub.firstCall.args).to.deep.equal(['connection', { id: `connection-id` }, { status: 'verified_them' }])
      expect(stub.secondCall.args).to.deep.equal([
        'connection_invite',
        { connection_id: `connection-id`, validity: 'valid' },
        { validity: 'used' },
      ])
    })

    test('happy path verified_them as holder', async function () {
      const { args, dbTransactionMock } = withCompanyDetailsDepsMock({
        dbGetConnection: [
          { status: 'verified_them', id: 'connection-id', company_name: 'NAME', company_number: 'NUMBER' },
        ],
      })
      const companyDetails = new CompanyDetailsV1Handler(...args)

      await companyDetails.handleDone({
        id: 'credential-id',
        connectionId: 'connection-id',
        protocolVersion: 'v2',
        role: 'holder',
        state: 'done',
      })

      const stub = dbTransactionMock.update
      expect(stub.callCount).to.equal(1)
      expect(stub.firstCall.args).to.deep.equal(['connection', { id: `connection-id` }, { status: 'verified_both' }])
    })

    test('happy path verified_us as issuer', async function () {
      const { args, dbTransactionMock } = withCompanyDetailsDepsMock({
        dbGetConnection: [
          { status: 'verified_us', id: 'connection-id', company_name: 'NAME', company_number: 'NUMBER' },
        ],
      })
      const companyDetails = new CompanyDetailsV1Handler(...args)

      await companyDetails.handleDone({
        id: 'credential-id',
        connectionId: 'connection-id',
        protocolVersion: 'v2',
        role: 'issuer',
        state: 'done',
      })

      const stub = dbTransactionMock.update
      expect(stub.callCount).to.equal(2)
      expect(stub.firstCall.args).to.deep.equal(['connection', { id: `connection-id` }, { status: 'verified_both' }])
      expect(stub.secondCall.args).to.deep.equal([
        'connection_invite',
        { connection_id: `connection-id`, validity: 'valid' },
        { validity: 'used' },
      ])
    })

    test('verified_both as holder', async function () {
      const { args, dbTransactionMock } = withCompanyDetailsDepsMock({
        dbGetConnection: [
          { status: 'verified_both', id: 'connection-id', company_name: 'NAME', company_number: 'NUMBER' },
        ],
      })
      const companyDetails = new CompanyDetailsV1Handler(...args)

      await companyDetails.handleDone({
        id: 'credential-id',
        connectionId: 'connection-id',
        protocolVersion: 'v2',
        role: 'holder',
        state: 'done',
      })

      const stub = dbTransactionMock.update
      expect(stub.callCount).to.equal(0)
    })

    test('verified_both as issuer', async function () {
      const { args, dbTransactionMock } = withCompanyDetailsDepsMock({
        dbGetConnection: [
          { status: 'verified_both', id: 'connection-id', company_name: 'NAME', company_number: 'NUMBER' },
        ],
      })
      const companyDetails = new CompanyDetailsV1Handler(...args)

      await companyDetails.handleDone({
        id: 'credential-id',
        connectionId: 'connection-id',
        protocolVersion: 'v2',
        role: 'issuer',
        state: 'done',
      })

      const stub = dbTransactionMock.update
      expect(stub.callCount).to.equal(0)
    })

    test('verified_us as holder', async function () {
      const { args, dbTransactionMock } = withCompanyDetailsDepsMock({
        dbGetConnection: [
          { status: 'verified_us', id: 'connection-id', company_name: 'NAME', company_number: 'NUMBER' },
        ],
      })
      const companyDetails = new CompanyDetailsV1Handler(...args)

      await companyDetails.handleDone({
        id: 'credential-id',
        connectionId: 'connection-id',
        protocolVersion: 'v2',
        role: 'holder',
        state: 'done',
      })

      const stub = dbTransactionMock.update
      expect(stub.callCount).to.equal(0)
    })

    test('verified_them as issuer', async function () {
      const { args, dbTransactionMock } = withCompanyDetailsDepsMock({
        dbGetConnection: [
          { status: 'verified_them', id: 'connection-id', company_name: 'NAME', company_number: 'NUMBER' },
        ],
      })
      const companyDetails = new CompanyDetailsV1Handler(...args)

      await companyDetails.handleDone({
        id: 'credential-id',
        connectionId: 'connection-id',
        protocolVersion: 'v2',
        role: 'issuer',
        state: 'done',
      })

      const stub = dbTransactionMock.update
      expect(stub.callCount).to.equal(0)
    })

    test('with unknown connection', async function () {
      const { args, dbTransactionMock } = withCompanyDetailsDepsMock({
        dbGetConnection: [],
      })
      const companyDetails = new CompanyDetailsV1Handler(...args)

      await companyDetails.handleDone({
        id: 'credential-id',
        connectionId: 'connection-id',
        protocolVersion: 'v2',
        role: 'issuer',
        state: 'done',
      })

      const stub = dbTransactionMock.update
      expect(stub.callCount).to.equal(0)
    })
  })
})
