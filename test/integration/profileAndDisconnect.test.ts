import { expect } from 'chai'
import { testCleanup } from '../helpers/cleanup.js'
import { setupTwoPartyContext, withEstablishedConnectionFromUs, type TwoPartyContext } from '../helpers/connection.js'
import { get } from '../helpers/routeHelper.js'

describe('integration tests for profile and disconnect page', function () {
  const context: TwoPartyContext = {} as TwoPartyContext

  before(async () => {
    await setupTwoPartyContext(context)
  })

  afterEach(async () => {
    await testCleanup(context.localCloudagent, context.localDatabase)
    await testCleanup(context.remoteCloudagent, context.remoteDatabase)
  })

  after(async () => {
    context.cloudagentEvents.stop()
  })

  describe('happy path', function () {
    withEstablishedConnectionFromUs(context)

    it('profile page returns success', async function () {
      const connection = await context.localDatabase.get('connection')
      const response = await get(context.app, `/connection/profile/${connection[0].id}`, {})
      expect(response.status).to.equal(200)
      expect(response.text.length).to.be.greaterThan(0)
    })

    it('disconnect page returns success', async function () {
      const connection = await context.localDatabase.get('connection')
      const response = await get(context.app, `/connection/disconnect/${connection[0].id}`, {})
      expect(response.status).to.equal(200)
      expect(response.text.length).to.be.greaterThan(0)
    })

    describe('with bank details', function () {
      beforeEach(async function () {
        const connection = await context.localDatabase.get('connection')
        await context.localDatabase.insert('query', {
          connection_id: connection[0].id,
          status: 'resolved',
          response_id: 'e3148c39-17f4-4c5f-9189-2a22c1a33283',
          details: {
            subjectId: { idType: 'bav' },
          },
          response: {
            name: 'Harry Potter',
            score: 1,
            accountId: '12345678',
            subjectId: { idType: 'bav' },
            countryCode: 'GB',
            description: 'Strong Match',
            clearingSystemId: '123456',
          },
          role: 'requester',
          type: 'beneficiary_account_validation',
          expires_at: new Date('2025-09-10 15:53:00+00'),
        })
      })

      it('profile page returns success with bank details', async function () {
        const connection = await context.localDatabase.get('connection')
        const response = await get(context.app, `/connection/profile/${connection[0].id}`, {})
        expect(response.status).to.equal(200)
        expect(response.text.length).to.be.greaterThan(0)
      })

      it('disconnect page returns success', async function () {
        const connection = await context.localDatabase.get('connection')
        const response = await get(context.app, `/connection/disconnect/${connection[0].id}`, {})
        expect(response.status).to.equal(200)
        expect(response.text.length).to.be.greaterThan(0)
      })

      it('disconnect page returns success when disconnection is true and marks connection disconnected', async function () {
        const connection = await context.localDatabase.get('connection')
        const response = await get(context.app, `/connection/disconnect/${connection[0].id}?disconnect=true`, {})
        expect(response.status).to.equal(200)
        expect(response.text.length).to.be.greaterThan(0)
        const disconnectedConnection = await context.localDatabase.get('connection')
        expect(disconnectedConnection[0].status).to.equal('disconnected')
      })
    })
  })
})
