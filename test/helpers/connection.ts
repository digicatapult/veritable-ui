import argon2 from 'argon2'
import type express from 'express'
import { container } from 'tsyringe'

import sinon from 'sinon'
import Database from '../../src/models/db/index.js'
import { ConnectionRow } from '../../src/models/db/types.js'
import EmailService from '../../src/models/emailService/index.js'
import VeritableCloudagent from '../../src/models/veritableCloudagent/index.js'
import VeritableCloudagentEvents from '../../src/services/veritableCloudagentEvents.js'
import { cleanupRemote } from './cleanup.js'
import { alice, bob, charlie } from './fixtures.js'
import { post } from './routeHelper.js'
import { delay } from './util.js'

export type TwoPartyConnection = {
  app: express.Express
  cloudagentEvents: VeritableCloudagentEvents
  smtpServer: EmailService

  localCloudagent: VeritableCloudagent
  localDatabase: Database
  localVerificationPin: string
  localConnectionId: string

  remoteCloudagent: VeritableCloudagent
  remoteDatabase: Database
  remoteVerificationPin: string
  remoteConnectionId: string
}

export type PartialQueryContext = {
  app: express.Express
  cloudagentEvents: VeritableCloudagentEvents
  smtpServer: EmailService
  agent: {
    alice: VeritableCloudagent
    bob: VeritableCloudagent
    charlie: VeritableCloudagent
  }
  db: {
    alice: Database
    bob: Database
    charlie: Database
  }
  aliceConnectionId: string
  charliesConnections: {
    withBob: ConnectionRow
  }
  bobsConnections: {
    withAlice: ConnectionRow
    withCharlie: ConnectionRow
  }
}

export const withEstablishedConnectionFromUs = function (context: TwoPartyConnection) {
  let emailSendStub: sinon.SinonStub

  beforeEach(async function () {
    await cleanupRemote(context)

    emailSendStub = sinon.stub(context.smtpServer, 'sendMail').resolves()
    await post(context.app, '/connection/new/create-invitation', {
      companyNumber: alice.company_number,
      email: 'alice@example.com',
      action: 'submit',
    })
    const invite = (emailSendStub.args.find(([name]) => name === 'connection_invite') || [])[1].invite
    const inviteUrl = JSON.parse(Buffer.from(invite, 'base64url').toString('utf8')).inviteUrl

    const adminEmailArgs = emailSendStub.args.find(([name]) => name === 'connection_invite_admin') || []
    context.remoteVerificationPin = adminEmailArgs[1].pin

    context.localVerificationPin = '123456'
    const pinHash = await argon2.hash(context.localVerificationPin, { secret: Buffer.from('secret', 'utf8') })
    const { connectionRecord, outOfBandRecord } = await context.remoteCloudagent.receiveOutOfBandInvite({
      companyName: alice.company_name,
      invitationUrl: inviteUrl,
    })

    const [{ id: remoteConnectionId }] = await context.remoteDatabase.insert('connection', {
      pin_attempt_count: 0,
      agent_connection_id: connectionRecord.id,
      company_name: alice.company_name,
      company_number: alice.company_number,
      status: 'unverified',
      pin_tries_remaining_count: null,
    })
    await context.remoteDatabase.insert('connection_invite', {
      validity: 'valid',
      connection_id: remoteConnectionId,
      expires_at: new Date(new Date().getTime() + 60 * 1000),
      oob_invite_id: outOfBandRecord.id,
      pin_hash: pinHash,
    })
    context.remoteConnectionId = remoteConnectionId

    // wait for status to not be pending
    for (let i = 0; i < 100; i++) {
      const connections = await context.localDatabase.get('connection')
      if (connections[0].status === 'pending') {
        await delay(10)
        continue
      }
      context.localConnectionId = connections[0].id
      return
    }
    throw new Error('Timeout Error initialising connection')
  })

  afterEach(async function () {
    await cleanupRemote(context)
    emailSendStub.restore()
  })
}

export const withEstablishedConnectionFromThem = function (context: TwoPartyConnection) {
  let emailSendStub: sinon.SinonStub

  beforeEach(async function () {
    await cleanupRemote(context)

    const invite = await context.remoteCloudagent.createOutOfBandInvite({ companyName: alice.company_name })
    const inviteContent = Buffer.from(
      JSON.stringify({
        companyNumber: alice.company_number,
        inviteUrl: invite.invitationUrl,
      }),
      'utf8'
    ).toString('base64url')

    const [{ id: remoteConnectionId }] = await context.remoteDatabase.insert('connection', {
      pin_attempt_count: 0,
      company_name: alice.company_name,
      company_number: alice.company_number,
      status: 'pending',
      agent_connection_id: null,
      pin_tries_remaining_count: null,
    })

    context.remoteConnectionId = remoteConnectionId
    context.localVerificationPin = '123456'
    const pinHash = await argon2.hash(context.localVerificationPin, { secret: Buffer.from('secret', 'utf8') })
    await context.remoteDatabase.insert('connection_invite', {
      validity: 'valid',
      connection_id: remoteConnectionId,
      expires_at: new Date(new Date().getTime() + 60 * 1000),
      oob_invite_id: invite.outOfBandRecord.id,
      pin_hash: pinHash,
    })

    emailSendStub = sinon.stub(context.smtpServer, 'sendMail')
    await post(context.app, '/connection/new/receive-invitation', {
      invite: inviteContent,
      action: 'createConnection',
    })
    const adminEmailArgs = emailSendStub.args.find(([name]) => name === 'connection_invite_admin') || []
    context.remoteVerificationPin = adminEmailArgs[1].pin

    // wait for status to not be pending
    for (let i = 0; i < 100; i++) {
      const connections = await context.localDatabase.get('connection')
      if (connections[0].status === 'pending') {
        await delay(10)
        continue
      }
      context.localConnectionId = connections[0].id
      return
    }
    throw new Error('Timeout Error initialising connection')
  })

  afterEach(async function () {
    await cleanupRemote(context)
    emailSendStub.restore()
  })
}

export const withVerifiedConnection = function (context: TwoPartyConnection) {
  let emailSendStub: sinon.SinonStub

  beforeEach(async function () {
    const email = container.resolve(EmailService)
    emailSendStub = sinon.stub(email, 'sendMail')
    await post(context.app, '/connection/new/create-invitation', {
      companyNumber: alice.company_number,
      email: 'alice@example.com',
      action: 'submit',
    })
    const invite = (emailSendStub.args.find(([name]) => name === 'connection_invite') || [])[1].invite
    const inviteUrl = JSON.parse(Buffer.from(invite, 'base64url').toString('utf8')).inviteUrl

    const [{ id: localConnectionId }] = await context.localDatabase.get('connection')
    context.localConnectionId = localConnectionId

    const { connectionRecord } = await context.remoteCloudagent.receiveOutOfBandInvite({
      companyName: alice.company_name,
      invitationUrl: inviteUrl,
    })

    const [{ id: remoteConnectionId }] = await context.remoteDatabase.insert('connection', {
      pin_attempt_count: 0,
      agent_connection_id: connectionRecord.id,
      company_name: alice.company_name,
      company_number: alice.company_number,
      status: 'pending',
      pin_tries_remaining_count: 4,
    })
    context.remoteConnectionId = remoteConnectionId

    // wait for status to not be pending
    const loopLimit = 100
    for (let i = 1; i <= loopLimit; i++) {
      const connectionsLocal = await context.localDatabase.get('connection')
      const connectionsRemote = await context.remoteDatabase.get('connection')
      if (connectionsLocal[0].status === 'pending' || connectionsRemote[0].status === 'pending') {
        await delay(10)
        continue
      }
      context.localConnectionId = connectionsLocal[0].id

      if (i === loopLimit) {
        throw new Error('Timeout Error initialising connection')
      }
    }

    await context.localDatabase.update('connection', { id: context.localConnectionId }, { status: 'verified_both' })
    await context.remoteDatabase.update('connection', { id: context.remoteConnectionId }, { status: 'verified_both' })
  })

  afterEach(async function () {
    await cleanupRemote(context)
    emailSendStub.restore()
  })
}

export async function withBobAndCharlie(context: PartialQueryContext) {
  let emailSendStub: sinon.SinonStub

  beforeEach(async function () {
    emailSendStub = sinon.stub(context.smtpServer, 'sendMail')
    await post(context.app, '/connection/new/create-invitation', {
      companyNumber: bob.company_number,
      email: 'bob@example.com',
      action: 'submit',
    })
    const invite = (emailSendStub.args.find(([name]) => name === 'connection_invite') || [])[1].invite
    const bobsInvite = JSON.parse(Buffer.from(invite, 'base64url').toString('utf8')).inviteUrl

    const [{ id: aliceConnectionId }] = await context.db.alice.get('connection')
    context.aliceConnectionId = aliceConnectionId

    // alice part on bob
    const pinHash = await argon2.hash('123456', { secret: Buffer.from('secret', 'utf8') })
    const aliceOOB = await context.agent.bob.receiveOutOfBandInvite({
      companyName: alice.company_name,
      invitationUrl: bobsInvite,
    })

    const [withAlice] = await context.db.bob.insert('connection', {
      pin_attempt_count: 0,
      agent_connection_id: aliceOOB.connectionRecord.id,
      company_name: alice.company_name,
      company_number: alice.company_number,
      status: 'pending',
      pin_tries_remaining_count: null,
    })

    await context.db.bob.insert('connection_invite', {
      connection_id: withAlice.id,
      oob_invite_id: aliceOOB.outOfBandRecord.id,
      pin_hash: pinHash,
      expires_at: new Date(new Date().getTime() + 60 * 1000),
      validity: 'valid',
    })

    const charliesInvite = await context.agent.charlie.createOutOfBandInvite({ companyName: charlie.company_name })
    const charlieOOB = await context.agent.bob.receiveOutOfBandInvite({
      companyName: charlie.company_name,
      invitationUrl: charliesInvite.invitationUrl,
    })

    const [withCharlie] = await context.db.bob.insert('connection', {
      pin_attempt_count: 0,
      agent_connection_id: charlieOOB.connectionRecord.id,
      company_name: charlie.company_name,
      company_number: charlie.company_number,
      status: 'pending',
      pin_tries_remaining_count: null,
    })

    await context.db.bob.insert('connection_invite', {
      connection_id: withCharlie.id,
      oob_invite_id: charlieOOB.outOfBandRecord.id,
      pin_hash: pinHash,
      expires_at: new Date(new Date().getTime() + 60 * 1000),
      validity: 'valid',
    })

    const [withBob] = await context.db.charlie.insert('connection', {
      pin_attempt_count: 0,
      agent_connection_id: null,
      company_name: bob.company_name,
      company_number: bob.company_number,
      status: 'pending',
      pin_tries_remaining_count: 4,
    })

    await context.db.charlie.insert('connection_invite', {
      connection_id: withBob.id,
      oob_invite_id: charliesInvite.outOfBandRecord.id,
      pin_hash: pinHash,
      expires_at: new Date(new Date().getTime() + 60 * 1000),
      validity: 'valid',
    })

    context.bobsConnections = { withAlice, withCharlie }
    context.charliesConnections = { withBob }

    await delay(3000)

    await context.db.alice.update('connection', { id: context.aliceConnectionId }, { status: 'verified_both' })
    await context.db.bob.update('connection', { id: withAlice.id }, { status: 'verified_both' })
    await context.db.bob.update('connection', { id: withCharlie.id }, { status: 'verified_both' })
    await context.db.charlie.update('connection', { id: withBob.id }, { status: 'verified_both' })
  })

  afterEach(async function () {
    emailSendStub.restore()
  })
}

export async function withAliceReceivesBobsInvite(context: {
  app: express.Express
  remoteCloudagent: VeritableCloudagent
}) {
  const invite = await context.remoteCloudagent.createOutOfBandInvite({ companyName: alice.company_name })
  const inviteContent = Buffer.from(
    JSON.stringify({
      companyNumber: alice.company_number,
      inviteUrl: invite.invitationUrl,
    }),
    'utf8'
  ).toString('base64url')

  return await post(context.app, '/connection/new/receive-invitation', {
    invite: inviteContent,
    action: 'createConnection',
  })
}
