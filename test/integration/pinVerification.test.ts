import { expect } from 'chai'
import { afterEach, beforeEach, describe } from 'mocha'

import { cleanupCloudagent, cleanupDatabase } from '../helpers/cleanup.js'
import {
  setupTwoPartyContext,
  TwoPartyConnection,
  withEstablishedConnectionFromThem,
  withEstablishedConnectionFromUs,
} from '../helpers/connection.js'
import { post } from '../helpers/routeHelper.js'
import { delay, delayAndReject } from '../helpers/util.js'

describe('pin-submission', function () {
  const context: TwoPartyConnection = {} as TwoPartyConnection

  beforeEach(async function () {
    await setupTwoPartyContext(context)
    Object.assign(context, {
      localConnectionId: '',
      localVerificationPin: '',
      remoteConnectionId: '',
      remoteVerificationPin: '',
    })
    await cleanupCloudagent([context.localCloudagent, context.remoteCloudagent])
    await cleanupDatabase([context.localDatabase, context.remoteDatabase])
  })

  afterEach(async () => {
    context.cloudagentEvents.stop()
    await cleanupCloudagent([context.localCloudagent, context.remoteCloudagent])
    await cleanupDatabase([context.localDatabase, context.remoteDatabase])
  })

  describe('pin verification of sender', function () {
    withEstablishedConnectionFromUs(context)

    beforeEach(async function () {
      const credentialDonePromise = new Promise<void>((resolve) => {
        context.cloudagentEvents.on(
          'CredentialStateChanged',
          ({
            payload: {
              credentialRecord: { state },
            },
          }) => {
            if (state === 'done') {
              resolve()
            }
          }
        )
      })

      await post(context.app, `/connection/${context.localConnectionId}/pin-submission`, {
        action: 'submitPinCode',
        pin: context.localVerificationPin,
      })

      await Promise.race([
        credentialDonePromise,
        delayAndReject(1000, 'Timeout waiting for credential to reach done state'),
      ])
    })

    it('should set local verification status to verified_us', async function () {
      for (let i = 0; i < 100; i++) {
        const [connection] = await context.localDatabase.get('connection', { id: context.localConnectionId })
        if (connection.status === 'verified_us') {
          return
        }
        await delay(10)
      }
      expect.fail('Expected connection to update to state verified_us')
    })

    it('should set remote verification status to verified_them', async function () {
      for (let i = 0; i < 100; i++) {
        const [connection] = await context.remoteDatabase.get('connection', { id: context.remoteConnectionId })
        if (connection.status === 'verified_them') {
          return
        }
        await delay(10)
      }
      expect.fail('Expected connection to update to state verified_them')
    })
  })

  describe('pin verification of receiver (send side)', function () {
    withEstablishedConnectionFromThem(context)

    beforeEach(async function () {
      const credentialDonePromise = new Promise<void>((resolve) => {
        context.cloudagentEvents.on(
          'CredentialStateChanged',
          ({
            payload: {
              credentialRecord: { state },
            },
          }) => {
            if (state === 'done') {
              resolve()
            }
          }
        )
      })

      await post(context.app, `/connection/${context.localConnectionId}/pin-submission`, {
        action: 'submitPinCode',
        pin: context.localVerificationPin,
      })

      await Promise.race([
        credentialDonePromise,
        delayAndReject(1000, 'Timeout waiting for credential to reach done state'),
      ])
    })

    it('should set local verification status to verified_us', async function () {
      for (let i = 0; i < 100; i++) {
        const [connection] = await context.localDatabase.get('connection', { id: context.localConnectionId })
        if (connection.status === 'verified_us') {
          return
        }
        await delay(10)
      }
      expect.fail('Expected connection to update to state verified_us')
    })

    it('should set remote verification status to verified_them', async function () {
      for (let i = 0; i < 100; i++) {
        const [connection] = await context.remoteDatabase.get('connection', { id: context.remoteConnectionId })
        if (connection.status === 'verified_them') {
          return
        }
        await delay(10)
      }
      expect.fail('Expected connection to update to state verified_them')
    })
  })
})
