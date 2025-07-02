import { expect } from 'chai'
import type express from 'express'
import { afterEach, beforeEach, describe } from 'mocha'

import { container } from 'tsyringe'
import Database from '../../src/models/db/index.js'
import VeritableCloudagent from '../../src/models/veritableCloudagent/index.js'
import createHttpServer from '../../src/server.js'
import VeritableCloudagentEvents from '../../src/services/veritableCloudagentEvents.js'
import { cleanupCloudagent } from '../helpers/cloudagent.js'
import { withEstablishedConnectionFromThem, withEstablishedConnectionFromUs } from '../helpers/connection.js'
import { cleanupDatabase } from '../helpers/db.js'
import { post } from '../helpers/routeHelper.js'
import { delay, delayAndReject } from '../helpers/util.js'

describe('pin-submission', function () {
  const db = container.resolve(Database)

  afterEach(async () => {
    await cleanupDatabase()
  })

  describe('pin verification of sender', function () {
    type Context = {
      app: express.Express
      cloudagentEvents: VeritableCloudagentEvents
      remoteDatabase: Database
      remoteCloudagent: VeritableCloudagent
      inviteUrl: string
      remoteVerificationPin: string
      localVerificationPin: string
      remoteConnectionId: string
      localConnectionId: string
    }
    const context: Context = {} as Context

    beforeEach(async function () {
      await cleanupDatabase()
      await cleanupCloudagent()
      const server = await createHttpServer(true)
      Object.assign(context, {
        ...server,
        inviteUrl: '',
        localConnectionId: '',
        localVerificationPin: '',
        remoteConnectionId: '',
        remoteVerificationPin: '',
      })
    })

    afterEach(async function () {
      await cleanupCloudagent()
      context.cloudagentEvents.stop()
    })

    withEstablishedConnectionFromUs(context)

    // method under test
    beforeEach(async function () {
      const cloudagentEvents = container.resolve(VeritableCloudagentEvents)
      const credentialDonePromise = new Promise<void>((resolve) => {
        cloudagentEvents.on(
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
        const [connection] = await db.get('connection', { id: context.localConnectionId })
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
    type Context = {
      app: express.Express
      cloudagentEvents: VeritableCloudagentEvents
      remoteDatabase: Database
      remoteCloudagent: VeritableCloudagent
      invite: string
      remoteVerificationPin: string
      localVerificationPin: string
      remoteConnectionId: string
      localConnectionId: string
    }
    const context: Context = {} as Context

    beforeEach(async function () {
      await cleanupDatabase()
      await cleanupCloudagent()
      const server = await createHttpServer(true)
      Object.assign(context, {
        ...server,
        inviteUrl: '',
        localConnectionId: '',
        localVerificationPin: '',
        remoteConnectionId: '',
        remoteVerificationPin: '',
      })
    })

    afterEach(async function () {
      await cleanupCloudagent()
      context.cloudagentEvents.stop()
    })

    withEstablishedConnectionFromThem(context)

    // method under test
    beforeEach(async function () {
      const cloudagentEvents = container.resolve(VeritableCloudagentEvents)
      const credentialDonePromise = new Promise<void>((resolve) => {
        cloudagentEvents.on(
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
        const [connection] = await db.get('connection', { id: context.localConnectionId })
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
