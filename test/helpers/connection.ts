import argon2 from 'argon2'
import type express from 'express'
import knex from 'knex'
import { container } from 'tsyringe'

import sinon from 'sinon'
import { Env } from '../../src/env/index.js'
import Database from '../../src/models/db/index.js'
import EmailService from '../../src/models/emailService/index.js'
import VeritableCloudagent from '../../src/models/veritableCloudagent/index.js'
import type * as PartialQuery from '../integration/partialQueryAggregation.test.js'
import { bob, charlie, validCompanyName, validCompanyNumber } from './fixtures.js'
import { mockLogger } from './logger.js'
import { post } from './routeHelper.js'
import { delay } from './util.js'

const remoteDbConfig = {
  client: 'pg',
  connection: {
    host: 'localhost',
    database: 'veritable-ui',
    user: 'postgres',
    password: 'postgres',
    port: 5433,
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: 'migrations',
  },
}

const bobDbConfig = remoteDbConfig

const charlieDbConfig = {
  client: 'pg',
  connection: {
    host: 'localhost',
    database: 'veritable-ui',
    user: 'postgres',
    password: 'postgres',
    port: 5434,
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: 'migrations',
  },
}

const mockEnv = {
  get(name) {
    if (name === 'CLOUDAGENT_ADMIN_ORIGIN') {
      return 'http://localhost:3101'
    }
    throw new Error('Unexpected env variable request')
  },
} as Env

const mockEnvBob = {
  get(name) {
    if (name === 'PORT') {
      return 3001
    }
    if (name === 'CLOUDAGENT_ADMIN_ORIGIN') {
      return 'http://localhost:3101'
    }
    throw new Error('Unexpected env variable request')
  },
} as Env

const mockEnvCharlie = {
  get(name) {
    if (name === 'PORT') {
      return 3002
    }
    if (name === 'CLOUDAGENT_ADMIN_ORIGIN') {
      return 'http://localhost:3102'
    }
    throw new Error('Unexpected env variable request')
  },
} as Env

const cleanupConnections = async (agent, db) => {
  for (const { id } of await agent.getConnections()) {
    await agent.deleteConnection(id)
  }
  await db.delete('connection', {})
}

const cleanupRemote = async (context) => {
  for (const { id } of await context.remoteCloudagent.getConnections()) {
    await context.remoteCloudagent.deleteConnection(id)
  }
  await context.remoteDatabase.delete('connection', {})
}

export const withEstablishedConnectionFromUs = function (context: {
  app: express.Express
  remoteDatabase: Database
  remoteCloudagent: VeritableCloudagent
  inviteUrl: string
  remoteVerificationPin: string
  localVerificationPin: string
  remoteConnectionId: string
  localConnectionId: string
}) {
  let emailSendStub: sinon.SinonStub

  beforeEach(async function () {
    const localDatabase = container.resolve(Database)
    context.remoteDatabase = new Database(knex(remoteDbConfig))
    context.remoteCloudagent = new VeritableCloudagent(mockEnv, mockLogger)

    await cleanupRemote(context)

    const email = container.resolve(EmailService)
    emailSendStub = sinon.stub(email, 'sendMail').resolves()
    await post(context.app, '/connection/new/create-invitation', {
      companyNumber: validCompanyNumber,
      email: 'alice@example.com',
      action: 'submit',
    })
    const invite = (emailSendStub.args.find(([name]) => name === 'connection_invite') || [])[1].invite
    context.inviteUrl = JSON.parse(Buffer.from(invite, 'base64url').toString('utf8')).inviteUrl

    const adminEmailArgs = emailSendStub.args.find(([name]) => name === 'connection_invite_admin') || []
    context.remoteVerificationPin = adminEmailArgs[1].pin

    context.localVerificationPin = '123456'
    const pinHash = await argon2.hash(context.localVerificationPin, { secret: Buffer.from('secret', 'utf8') })
    const { connectionRecord, outOfBandRecord } = await context.remoteCloudagent.receiveOutOfBandInvite({
      companyName: validCompanyName,
      invitationUrl: context.inviteUrl,
    })

    const [{ id: remoteConnectionId }] = await context.remoteDatabase.insert('connection', {
      pin_attempt_count: 0,
      agent_connection_id: connectionRecord.id,
      company_name: validCompanyName,
      company_number: validCompanyNumber,
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
      const connections = await localDatabase.get('connection')
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

export const withEstablishedConnectionFromThem = function (context: {
  app: express.Express
  remoteDatabase: Database
  remoteCloudagent: VeritableCloudagent
  invite: string
  remoteVerificationPin: string
  localVerificationPin: string
  remoteConnectionId: string
  localConnectionId: string
}) {
  let emailSendStub: sinon.SinonStub

  beforeEach(async function () {
    const localDatabase = container.resolve(Database)
    context.remoteDatabase = new Database(knex(remoteDbConfig))
    context.remoteCloudagent = new VeritableCloudagent(mockEnv, mockLogger)

    await cleanupRemote(context)

    const invite = await context.remoteCloudagent.createOutOfBandInvite({ companyName: validCompanyName })
    context.invite = Buffer.from(
      JSON.stringify({
        companyNumber: validCompanyNumber,
        inviteUrl: invite.invitationUrl,
      }),
      'utf8'
    ).toString('base64url')

    const [{ id: remoteConnectionId }] = await context.remoteDatabase.insert('connection', {
      pin_attempt_count: 0,
      company_name: validCompanyName,
      company_number: validCompanyNumber,
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

    const email = container.resolve(EmailService)
    emailSendStub = sinon.stub(email, 'sendMail')
    await post(context.app, '/connection/new/receive-invitation', {
      invite: context.invite,
      action: 'createConnection',
    })
    const adminEmailArgs = emailSendStub.args.find(([name]) => name === 'connection_invite_admin') || []
    context.remoteVerificationPin = adminEmailArgs[1].pin

    // wait for status to not be pending
    for (let i = 0; i < 100; i++) {
      const connections = await localDatabase.get('connection')
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

export const withVerifiedConnection = function (
  context: {
    app: express.Express
    remoteDatabase: Database
    remoteCloudagent: VeritableCloudagent
    remoteConnectionId: string
    localConnectionId: string
  },
  emailService: EmailService
) {
  let emailSendStub: sinon.SinonStub

  beforeEach(async function () {
    const localDatabase = container.resolve(Database)
    context.remoteDatabase = new Database(knex(remoteDbConfig))
    context.remoteCloudagent = new VeritableCloudagent(mockEnv, mockLogger)

    await cleanupRemote(context)

    emailSendStub = sinon.stub(emailService, 'sendMail')
    await post(context.app, '/connection/new/create-invitation', {
      companyNumber: validCompanyNumber,
      email: 'alice@example.com',
      action: 'submit',
    })
    const invite = (emailSendStub.args.find(([name]) => name === 'connection_invite') || [])[1].invite
    const inviteUrl = JSON.parse(Buffer.from(invite, 'base64url').toString('utf8')).inviteUrl

    const [{ id: localConnectionId }] = await localDatabase.get('connection')
    context.localConnectionId = localConnectionId

    const { connectionRecord } = await context.remoteCloudagent.receiveOutOfBandInvite({
      companyName: validCompanyName,
      invitationUrl: inviteUrl,
    })

    const [{ id: remoteConnectionId }] = await context.remoteDatabase.insert('connection', {
      pin_attempt_count: 0,
      agent_connection_id: connectionRecord.id,
      company_name: validCompanyName,
      company_number: validCompanyNumber,
      status: 'pending',
      pin_tries_remaining_count: 4,
    })
    context.remoteConnectionId = remoteConnectionId

    // wait for status to not be pending
    const loopLimit = 100
    for (let i = 1; i <= loopLimit; i++) {
      const connectionsLocal = await localDatabase.get('connection')
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

    await localDatabase.update('connection', { id: context.localConnectionId }, { status: 'verified_both' })
    await context.remoteDatabase.update('connection', { id: context.remoteConnectionId }, { status: 'verified_both' })
  })

  afterEach(async function () {
    await cleanupRemote(context)
    emailSendStub.restore()
  })
}

export const withBobAndCharlie = function (context: PartialQuery.Context) {
  let emailSendStub: sinon.SinonStub

  beforeEach(async function () {
    context.agent = {
      bob: new VeritableCloudagent(mockEnvBob, mockLogger),
      alice: new VeritableCloudagent(mockEnv, mockLogger),
      charlie: new VeritableCloudagent(mockEnvCharlie, mockLogger),
    }
    context.db = {
      alice: context.db.alice,
      bob: new Database(knex(bobDbConfig)),
      charlie: new Database(knex(charlieDbConfig)),
    }

    await cleanupConnections(context.agent.bob, context.db.bob)
    await cleanupConnections(context.agent.charlie, context.db.charlie)

    const email = container.resolve(EmailService)
    emailSendStub = sinon.stub(email, 'sendMail')
    await post(context.app, '/connection/new/create-invitation', {
      companyNumber: bob.company_number,
      email: 'alice@example.com',
      action: 'submit',
    })
    const invite = (emailSendStub.args.find(([name]) => name === 'connection_invite') || [])[1].invite
    const bobsInvite = JSON.parse(Buffer.from(invite, 'base64url').toString('utf8')).inviteUrl

    const [{ id: aliceConnectionId }] = await context.db.alice.get('connection')
    context.aliceConnectionId = aliceConnectionId

    // alice part on bob
    const pinHash = await argon2.hash('123456', { secret: Buffer.from('secret', 'utf8') })
    const aliceOOB = await context.agent.bob.receiveOutOfBandInvite({
      companyName: validCompanyName,
      invitationUrl: bobsInvite,
    })

    const [withAlice] = await context.db.bob.insert('connection', {
      pin_attempt_count: 0,
      agent_connection_id: aliceOOB.connectionRecord.id,
      company_name: validCompanyName,
      company_number: validCompanyNumber,
      status: 'pending',
      pin_tries_remaining_count: null,
    })
    context.bobsConnections.withAlice = withAlice

    await context.db.bob.insert('connection_invite', {
      validity: 'valid',
      connection_id: withAlice.id,
      expires_at: new Date(new Date().getTime() + 60 * 1000),
      oob_invite_id: aliceOOB.outOfBandRecord.id,
      pin_hash: pinHash,
    })

    const charliesInvite = await context.agent.charlie.createOutOfBandInvite({ companyName: charlie.company_name })
    const charlieOOB = await context.agent.bob.receiveOutOfBandInvite({
      companyName: charlie.company_name,
      invitationUrl: charliesInvite.invitationUrl,
    })

    const [withCharlie] = await context.db.bob.insert('connection', {
      pin_attempt_count: 0,
      company_name: charlie.company_name,
      company_number: charlie.company_number,
      agent_connection_id: charlieOOB.connectionRecord.id,
      status: 'pending',
      pin_tries_remaining_count: null,
    })
    context.bobsConnections.withCharlie = withCharlie

    await context.db.bob.insert('connection_invite', {
      connection_id: withCharlie.id,
      oob_invite_id: charlieOOB.outOfBandRecord.id,
      pin_hash: pinHash,
      expires_at: new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000),
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
    context.charliesConnections.withBob = withBob

    await context.db.charlie.insert('connection_invite', {
      validity: 'valid',
      connection_id: withBob.id,
      expires_at: new Date(new Date().getTime() + 60 * 1000),
      oob_invite_id: charliesInvite.outOfBandRecord.id,
      pin_hash: pinHash,
    })

    await delay(3000)

    await context.db.alice.update('connection', { id: context.aliceConnectionId }, { status: 'verified_both' })
    await context.db.bob.update('connection', { id: withAlice.id }, { status: 'verified_both' })
    await context.db.bob.update('connection', { id: withCharlie.id }, { status: 'verified_both' })
    await context.db.charlie.update('connection', { id: withBob.id }, { status: 'verified_both' })
  })

  afterEach(async function () {
    emailSendStub.restore()
    await cleanupConnections(context.agent.bob, context.db.bob)
    await cleanupConnections(context.agent.charlie, context.db.charlie)
  })
}
