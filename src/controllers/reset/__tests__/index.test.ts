import { expect } from 'chai'
import { describe, it } from 'mocha'
import { pino } from 'pino'
import sinon from 'sinon'

import { Env } from '../../../env.js'
import { BadRequestError } from '../../../errors.js'
import { ILogger } from '../../../logger.js'
import Database from '../../../models/db/index.js'
import VeritableCloudagent from '../../../models/veritableCloudagent.js'
import { ResetController } from '../index.js'

const dbMock = {
  get: sinon.stub().callsFake(() =>
    Promise.resolve([
      { id: '1', agent_connection_id: '1' },
      { id: '2', agent_connection_id: '2' },
      { id: '3', agent_connection_id: '3' },
    ])
  ),
  delete: sinon.stub(),
}

const cloudagentMock = {
  getConnectionById: sinon.stub().callsFake((id: string) => Promise.resolve([{ id }])),
  getCredentialByConnectionId: sinon.stub().callsFake((id: string) => Promise.resolve([[{ id }]])),
  deleteConnection: sinon.stub(),
  deleteCredential: sinon.stub(),
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
  afterEach(() => {
    sinon.restore()
  })

  describe('/reset ', () => {
    describe('if DEMO_MODE is set to false', () => {
      beforeEach(async () => {
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
      beforeEach(async () => {
        let { args } = withMocks(true)
        const controller = new ResetController(...args)

        try {
          result = (await controller.reset()) as unknown
        } catch (err) {
          result = err
        }
      })

      it('gets list of local connections and credentials with connections from cloudagent', () => {
        expect(dbMock.get.calledWith('connection')).to.be.equal(true)
        expect(cloudagentMock.getCredentialByConnectionId.calledWith('1')).to.be.equal(true)
        expect(cloudagentMock.getConnectionById.calledWith('1')).to.be.equal(true)
        expect(cloudagentMock.getCredentialByConnectionId.callCount).to.be.equal(3)
        expect(cloudagentMock.getConnectionById.callCount).to.be.equal(3)
        expect(cloudagentMock.deleteCredential.callCount).to.be.equal(3)
        expect(cloudagentMock.deleteConnection.callCount).to.be.equal(3)
      })

      it('deletes connections and credentials locally and from cloudagent', () => {
        expect(dbMock.delete.firstCall.args).to.deep.equal(['connection', {}])
        expect(dbMock.delete.secondCall.args).to.deep.equal(['connection_invite', {}])
      })

      it('return 200', () => {
        expect(result).to.deep.equal({ statusCode: 200 })
      })
    })
  })
})
