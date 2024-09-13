import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'

import { Request } from 'express'
import { Env } from '../../../env.js'
import { BadRequestError, InternalError } from '../../../errors.js'
import Database from '../../../models/db/index.js'
import { TABLE } from '../../../models/db/types.js'
import VeritableCloudagent from '../../../models/veritableCloudagent.js'
import { mockLogger } from '../../__tests__/helpers.js'
import { ResetController } from '../index.js'

const fixtures = {
  connection: [
    { id: 'some-connection-id-1', agent_connection_id: 'some-agent-id-1' },
    { id: 'some-connection-id-2', agent_connection_id: 'some-agent-id-2' },
    { id: 'some-connection-id-3', agent_connection_id: 'some-agent-id-3' },
  ],
  connection_invite: [
    { id: 'some-invite-id-1', connection_id: 'some-connection-id-1' },
    { id: 'some-invite-id-2', connection_id: 'some-connection-id-2' },
    { id: 'some-invite-id-3', connection_id: 'some-connection-id-3' },
  ],
  query: [{ id: 'some-query-id-1' }],
  query_rpc: [
    { id: 'some-query_rpc-id-1', query_id: 'some-query-id-1' },
    /* TODO */
  ],
  agent_connections: [{ id: 'some-agent-id-1' }, { id: 'some-agent-id-2' }, { id: 'some-agent-id-3' }],
  agent_credentials: [{ id: 'some-agent-credential-id-1' }, { id: 'some-agent-credential-id-2' }],
}

const dbMock = {
  get: sinon.stub().callsFake((table: TABLE) => fixtures[table]),
  delete: sinon.stub().resolves(),
}

const cloudagentMock = {
  deleteConnection: sinon.stub(),
  deleteCredential: sinon.stub(),
  getCredentials: sinon.stub().callsFake(() => Promise.resolve(fixtures['agent_credentials'])),
  getConnections: sinon.stub().resolves(fixtures['agent_connections']),
}

const withMocks = (DEMO_MODE: boolean = true) => {
  const mockEnv = {
    get: sinon.stub().callsFake((name: string) => {
      if (name === 'DEMO_MODE') return DEMO_MODE
    }),
  }

  return {
    mockEnv,
    dbMock,
    cloudagentMock,
    args: [
      mockEnv as unknown as Env,
      dbMock as unknown as Database,
      cloudagentMock as unknown as VeritableCloudagent,
    ] as const,
  }
}

type ResetControllerPublic = ResetController & { isReset: ResetController['isReset'] }
const stubIsReset = (controller: ResetController, val: boolean) => {
  sinon.stub(controller as unknown as ResetControllerPublic, 'isReset').callsFake(() => Promise.resolve(val))
}

describe('ResetController', () => {
  let result: unknown
  const req = { log: mockLogger } as unknown as Request

  before(() => {})
  afterEach(() => {
    sinon.restore()
  })

  describe('/reset ', () => {
    describe('if DEMO_MODE is set to false', () => {
      before(async () => {
        const { args } = withMocks(false)
        const controller = new ResetController(...args)

        try {
          result = (await controller.reset(req)) as unknown
        } catch (err) {
          result = err
        }
      })

      it('returns 400 along with BadRequestError instance', () => {
        expect(result).to.be.instanceOf(BadRequestError)
        expect(result).to.have.property('message').that.is.equal('DEMO_MODE is false')
      })

      it('does not call any local db quries', () => {
        expect(dbMock.get.callCount).to.be.equal(0)
        expect(dbMock.delete.callCount).to.be.equal(0)
      })

      it('doest not call any cloudagents methods too', () => {
        expect(cloudagentMock.deleteConnection.callCount).to.be.equal(0)
        expect(cloudagentMock.deleteCredential.callCount).to.be.equal(0)
      })
    })

    describe('if DEMO_MODE = true', () => {
      before(async () => {
        sinon.restore()
        dbMock.get.onFirstCall().resolves(fixtures.connection)
        dbMock.get.onSecondCall().resolves(fixtures.connection_invite)
        dbMock.get.onSecondCall().resolves([])
        dbMock.get.onThirdCall().resolves([])
        dbMock.get.onCall(4).resolves([])
        const { args } = withMocks()

        const controller = new ResetController(...args)

        try {
          result = (await controller.reset(req)) as unknown
        } catch (err) {
          result = err
        }
      })

      describe('and if isReset() returns false', () => {
        it('throws InternalError and returns error message', async () => {
          const { args } = withMocks()
          const controller = new ResetController(...args)
          stubIsReset(controller, false)

          try {
            result = await controller.reset(req)
          } catch (err) {
            result = err
          }

          expect(result)
            .to.be.instanceOf(InternalError)
            .that.has.property('message')
            .that.is.equal('Error: reset failed')
        })
      })

      it('gets list of local connections and connections with credentials from cloudagent', () => {
        expect(dbMock.delete.calledWith('connection')).to.be.equal(true)
        expect(cloudagentMock.getCredentials.callCount).to.be.equal(2)
        expect(cloudagentMock.getConnections.callCount).to.be.equal(2)
      })

      it('deletes connections and connection_invites locally', () => {
        expect(dbMock.delete.firstCall.args).to.deep.equal(['connection', {}])
        expect(cloudagentMock.deleteCredential.firstCall.args).to.deep.equal(['some-agent-credential-id-1'])
        expect(cloudagentMock.deleteCredential.secondCall.args).to.deep.equal(['some-agent-credential-id-2'])
        expect(cloudagentMock.deleteConnection.firstCall.args).to.deep.equal(['some-agent-id-1'])
        expect(cloudagentMock.deleteConnection.secondCall.args).to.deep.equal(['some-agent-id-2'])
        expect(cloudagentMock.deleteConnection.thirdCall.args).to.deep.equal(['some-agent-id-3'])
        expect(cloudagentMock.deleteCredential.callCount).to.be.equal(2)
        expect(cloudagentMock.deleteConnection.callCount).to.be.equal(3)
      })

      it('confirms that records have been removed', () => {
        expect(cloudagentMock.getCredentials.callCount).to.be.equal(2)
        expect(cloudagentMock.getConnections.callCount).to.be.equal(2)
      })

      it('return(200', async () => {
        const { args } = withMocks(true)
        const controller = new ResetController(...args)
        stubIsReset(controller, true)
        result = await controller.reset(req)

        expect(result).to.deep.equal({ statusCode: 200 })
      })
    })
  })
})
