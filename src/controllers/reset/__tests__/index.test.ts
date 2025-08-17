import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'

import { Request } from 'express'
import { Env } from '../../../env/index.js'
import { ForbiddenError, InternalError } from '../../../errors.js'
import Database from '../../../models/db/index.js'
import { TABLE } from '../../../models/db/types.js'
import VeritableCloudagent from '../../../models/veritableCloudagent/index.js'
import { mockLogger } from '../../__tests__/helpers.js'
import { ResetController } from '../index.js'

const fixtures = {
  connection: [
    { id: '00000000-1111-4000-a000-000000000000', agent_connection_id: '00000000-1111-4000-a000-000000001111' },
    { id: '00000000-2222-4000-a000-000000000000', agent_connection_id: '00000000-1111-4000-a000-000000002222' },
    { id: '00000000-3333-4000-a000-000000000000', agent_connection_id: '00000000-1111-4000-a000-000000003333' },
  ],
  connection_invite: [
    { id: '00000000-1111-4000-a000-111100001111', connection_id: '00000000-1111-4000-a000-000000000000' },
    { id: '00000000-2222-4000-a000-222200002222', connection_id: '00000000-2222-4000-a000-000000000000' },
    { id: '00000000-3333-4000-a000-333300003333', connection_id: '00000000-3333-4000-a000-000000000000' },
  ],
  query: [{ id: '11111111-1111-4000-a000-111100001111' }],
  query_rpc: [
    { id: '11111111-1111-4000-a000-000011110000', query_id: '11111111-1111-4000-a000-111100001111' },
    /* TODO */
  ],
  agent_connections: [
    { id: '00000000-1111-4000-a000-000000001111' },
    { id: '00000000-1111-4000-a000-000000002222' },
    { id: '00000000-1111-4000-a000-000000003333' },
  ],
  agent_credentials: [{ id: '11110000-1111-4000-a000-000000000000' }, { id: '22220000-2222-4000-a000-000000000000' }],
  settings: [],
  organisation_registries: [
    {
      id: 'some-organisation-registry-id-1',
      country_code: 'GB',
      registry_key: 'company_house',
      url: 'https://api.company-information.service.gov.uk',
      api_key: '',
    },
  ],
}

const dbMock = {
  get: sinon.stub().callsFake((table: TABLE) => fixtures[table]),
  delete: sinon.stub().resolves(),
}

const cloudagentMock = {
  deleteConnection: sinon.stub(),
  deleteCredential: sinon.stub(),
  deleteOutOfBandInvite: sinon.stub(),
  getCredentials: sinon.stub().callsFake(() => Promise.resolve(fixtures['agent_credentials'])),
  getConnections: sinon.stub().resolves(fixtures['agent_connections']),
  getOutOfBandInvites: sinon.stub().resolves(fixtures['connection_invite']),
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

type ResetControllerPublic = { isReset: ResetController['isReset'] }

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

      it('returns 401 along with Forbidden message', () => {
        expect(result).to.be.instanceOf(ForbiddenError)
        expect(result).to.have.property('message').that.is.equal('DEMO_MODE is false')
      })

      it('does not call any local db quries', () => {
        expect(dbMock.get.callCount).to.be.equal(0)
        expect(dbMock.delete.callCount).to.be.equal(0)
      })

      it('doest not call any cloudagents methods too', () => {
        expect(cloudagentMock.deleteConnection.callCount).to.be.equal(0)
        expect(cloudagentMock.deleteCredential.callCount).to.be.equal(0)
        expect(cloudagentMock.deleteOutOfBandInvite.callCount).to.be.equal(0)
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
          sinon.stub(controller as unknown as ResetControllerPublic, 'isReset').rejects(Error)

          try {
            result = await controller.reset(req)
          } catch (err) {
            result = err
          }

          // eslint-disable-next-line prettier/prettier
          expect(result)
            .to.be.instanceOf(InternalError)
            .that.has.property('message')
            .that.includes('reset failed')
        })
      })

      it('gets list of local connections and connections with credentials from cloudagent', () => {
        expect(dbMock.delete.calledWith('connection')).to.be.equal(true)
        expect(cloudagentMock.getCredentials.callCount).to.be.equal(2)
        expect(cloudagentMock.getConnections.callCount).to.be.equal(2)
      })

      it('deletes connections and connection_invites locally', () => {
        expect(dbMock.delete.firstCall.args).to.deep.equal(['connection', {}])
        expect(cloudagentMock.deleteCredential.firstCall.args).to.deep.equal(['11110000-1111-4000-a000-000000000000'])
        expect(cloudagentMock.deleteCredential.secondCall.args).to.deep.equal(['22220000-2222-4000-a000-000000000000'])
        expect(cloudagentMock.deleteCredential.callCount).to.be.equal(2)
        expect(cloudagentMock.deleteConnection.firstCall.args).to.deep.equal(['00000000-1111-4000-a000-000000001111'])
        expect(cloudagentMock.deleteConnection.secondCall.args).to.deep.equal(['00000000-1111-4000-a000-000000002222'])
        expect(cloudagentMock.deleteConnection.thirdCall.args).to.deep.equal(['00000000-1111-4000-a000-000000003333'])
        expect(cloudagentMock.deleteConnection.callCount).to.be.equal(3)
        expect(cloudagentMock.deleteOutOfBandInvite.firstCall.args).to.deep.equal([
          '00000000-1111-4000-a000-111100001111',
        ])
        expect(cloudagentMock.deleteOutOfBandInvite.secondCall.args).to.deep.equal([
          '00000000-2222-4000-a000-222200002222',
        ])
        expect(cloudagentMock.deleteOutOfBandInvite.thirdCall.args).to.deep.equal([
          '00000000-3333-4000-a000-333300003333',
        ])
        expect(cloudagentMock.deleteOutOfBandInvite.callCount).to.be.equal(3)
      })

      it('confirms that records have been removed', () => {
        expect(cloudagentMock.getCredentials.callCount).to.be.equal(2)
        expect(cloudagentMock.getConnections.callCount).to.be.equal(2)
        expect(cloudagentMock.getOutOfBandInvites.callCount).to.be.equal(2)
      })

      it('return(200)', async () => {
        const { args } = withMocks(true)
        const controller = new ResetController(...args)
        sinon.stub(controller as unknown as ResetControllerPublic, 'isReset').resolves()
        result = await controller.reset(req)

        expect(result).to.deep.equal({ statusCode: 200 })
      })
    })
  })
})
