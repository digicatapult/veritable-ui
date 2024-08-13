import { expect } from 'chai'
import { describe, it } from 'mocha'
import { pino } from 'pino'
import sinon from 'sinon'

import { Env } from '../../../env.js'
import { BadRequestError, InternalError } from '../../../errors.js'
import { ILogger } from '../../../logger.js'
import Database from '../../../models/db/index.js'
import VeritableCloudagent from '../../../models/veritableCloudagent.js'
import { ResetController } from '../index.js'

const fixtures = {
  connections: [
    { id: 'some-connection-id-1', agent_connection_id: 'some-agent-id-1' },
    { id: 'some-connection-id-2', agent_connection_id: 'some-agent-id-2' },
    { id: 'some-connection-id-3', agent_connection_id: 'some-agent-id-3' },
  ],
  connection_invites: [
    { id: 'some-invite-id-1', connection_id: 'some-connection-id-1' },
    { id: 'some-invite-id-2', connection_id: 'some-connection-id-2' },
    { id: 'some-invite-id-3', connection_id: 'some-connection-id-3' },
  ],
}

const dbMock = {
  get: sinon.stub(),
  delete: sinon.stub(),
}

const cloudagentMock = {
  getConnectionById: sinon.stub().callsFake((id: string) => Promise.resolve([{ id }])),
  getCredentialByConnectionId: sinon.stub().callsFake((id: string) => Promise.resolve([{ id }])),
  deleteConnection: sinon.stub(),
  deleteCredential: sinon.stub(),
  getCredentials: sinon.stub().callsFake(() => Promise.resolve([])),
  getConnections: sinon.stub().resolves([]),
}

const withMocks = (DEMO_MODE: Boolean = true) => {
  const mockLogger: ILogger = pino({ level: 'silent' })
  const mockEnv = {
    get: sinon.stub().callsFake((name: string) => {
      if (name === 'DEMO_MODE') return DEMO_MODE
    }),
  }

  return {
    mockEnv,
    mockLogger,
    dbMock,
    cloudagentMock,
    args: [
      mockEnv as unknown as Env,
      dbMock as unknown as Database,
      cloudagentMock as unknown as VeritableCloudagent,
      mockLogger,
    ] as const,
  }
}

describe.only('ResetController', () => {
  let result: unknown
  before(() => {})
  afterEach(() => {
    sinon.restore()
  })

  describe('/reset ', () => {
    describe('if DEMO_MODE is set to false', () => {
      before(async () => {
        let { args } = withMocks(false)
        const controller = new ResetController(...args)

        try {
          result = (await controller.reset()) as unknown
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
        expect(cloudagentMock.getConnectionById.callCount).to.be.equal(0)
        expect(cloudagentMock.getCredentialByConnectionId.callCount).to.be.equal(0)
      })
    })

    describe('if DEMO_MODE = true', () => {
      before(async () => {
        sinon.restore()
        dbMock.get.onFirstCall().resolves(fixtures.connections)
        dbMock.get.onSecondCall().resolves(fixtures.connection_invites)
        dbMock.get.onSecondCall().resolves([])
        dbMock.get.onThirdCall().resolves([])
        dbMock.get.onCall(4).resolves([])
        let { args } = withMocks()

        const controller = new ResetController(...args)

        try {
          result = (await controller.reset()) as unknown
        } catch (err) {
          result = err
        }
      })

      describe('and if isReset() returns false', () => {
        it('throws InternalError and returns error message', async () => {
          let { args } = withMocks()
          const controller = new ResetController(...args)
          controller.isReset = sinon.stub().callsFake(() => Promise.resolve(false))

          try {
            result = (await controller.reset()) as unknown
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
        expect(dbMock.get.calledWith('connection')).to.be.equal(true)
        expect(dbMock.get.calledWith('connection_invite')).to.be.equal(true)
        expect(cloudagentMock.getCredentialByConnectionId.calledWith('some-agent-id-1')).to.be.equal(true)
        expect(cloudagentMock.getConnectionById.calledWith('some-agent-id-1')).to.be.equal(true)
        expect(cloudagentMock.getCredentialByConnectionId.calledWith('some-agent-id-2')).to.be.equal(true)
        expect(cloudagentMock.getConnectionById.calledWith('some-agent-id-2')).to.be.equal(true)
        expect(cloudagentMock.getCredentialByConnectionId.calledWith('some-agent-id-3')).to.be.equal(true)
        expect(cloudagentMock.getConnectionById.calledWith('some-agent-id-3')).to.be.equal(true)
        expect(cloudagentMock.getCredentialByConnectionId.callCount).to.be.equal(3)
        expect(cloudagentMock.getConnectionById.callCount).to.be.equal(3)
      })

      it('deletes connections and connection_invites locally', () => {
        expect(dbMock.delete.firstCall.args).to.deep.equal(['connection', {}])
        expect(dbMock.delete.secondCall.args).to.deep.equal(['connection_invite', {}])
        expect(cloudagentMock.deleteCredential.firstCall.args).to.deep.equal(['some-agent-id-1'])
        expect(cloudagentMock.deleteCredential.secondCall.args).to.deep.equal(['some-agent-id-2'])
        expect(cloudagentMock.deleteCredential.thirdCall.args).to.deep.equal(['some-agent-id-3'])
        expect(cloudagentMock.deleteCredential.callCount).to.be.equal(3)
        expect(cloudagentMock.deleteConnection.callCount).to.be.equal(3)
      })

      it('confirms that records have been removed', () => {
        expect(cloudagentMock.getCredentials.callCount).to.be.equal(1)
        expect(cloudagentMock.getConnections.callCount).to.be.equal(1)
      })

      it('return 200', async () => {
        let { args } = withMocks(true)
        const controller = new ResetController(...args)
        controller.isReset = sinon.stub().callsFake(() => Promise.resolve(true))

        try {
          result = (await controller.reset()) as unknown
        } catch (err) {
          result = err
        }
        expect(result).to.deep.equal({ statusCode: 200 })
      })
    })
  })
})
