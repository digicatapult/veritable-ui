import argon2 from 'argon2'
import type express from 'express'
import knex from 'knex'
import { container } from 'tsyringe'

import sinon from 'sinon'
import { Env } from '../../src/env.js'
import Database from '../../src/models/db/index.js'
import EmailService from '../../src/models/emailService/index.js'
import VeritableCloudagent from '../../src/models/veritableCloudagent.js'
import { validCompanyName, validCompanyNumber } from './fixtures.js'
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

const mockEnv = {
  get(name) {
    if (name === 'CLOUDAGENT_ADMIN_ORIGIN') {
      return 'http://localhost:3101'
    }
    throw new Error('Unexpected env variable request')
  },
} as Env

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

  const cleanupRemote = async () => {
    const remoteConnections = await context.remoteCloudagent.getConnections()
    for (const { id } of remoteConnections) {
      await context.remoteCloudagent.deleteConnection(id)
    }
    await context.remoteDatabase.delete('connection', {})
  }

  beforeEach(async function () {
    const localDatabase = container.resolve(Database)
    context.remoteDatabase = new Database(knex(remoteDbConfig))
    context.remoteCloudagent = new VeritableCloudagent(mockEnv, mockLogger)

    await cleanupRemote()

    const email = container.resolve(EmailService)
    emailSendStub = sinon.stub(email, 'sendMail')
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
    await cleanupRemote()
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

  const cleanupRemote = async () => {
    const remoteConnections = await context.remoteCloudagent.getConnections()
    for (const { id } of remoteConnections) {
      await context.remoteCloudagent.deleteConnection(id)
    }
    await context.remoteDatabase.delete('connection', {})
  }

  beforeEach(async function () {
    const localDatabase = container.resolve(Database)
    context.remoteDatabase = new Database(knex(remoteDbConfig))
    context.remoteCloudagent = new VeritableCloudagent(mockEnv, mockLogger)

    await cleanupRemote()

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
    await cleanupRemote()
    emailSendStub.restore()
  })
}
