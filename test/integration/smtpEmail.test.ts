import { expect } from 'chai'
import express from 'express'
import { describe, it } from 'mocha'

import http from 'http'
import { z } from 'zod'
import { resetContainer } from '../../src/ioc.js'
import createHttpServer from '../../src/server.js'
import VeritableCloudagentEvents from '../../src/services/veritableCloudagentEvents.js'
import { cleanupCloudagent } from '../helpers/cloudagent.js'
import { cleanupDatabase } from '../helpers/db.js'
import { alice } from '../helpers/fixtures.js'
import { post } from '../helpers/routeHelper.js'

const ToSchema = z.array(z.string())

const EmailItemSchema = z.object({
  isRelayed: z.boolean(),
  deliveredTo: z.string().email(),
  id: z.string().uuid(),
  from: z.string().email(),
  to: ToSchema,
  receivedDate: z.string().datetime(),
  subject: z.string(),
  attachmentCount: z.number().int(),
  isUnread: z.boolean(),
})

const EmailResponseSchema = z.object({
  results: z.array(EmailItemSchema),
})

describe('SMTP email', () => {
  let server: { app: express.Express; cloudagentEvents: VeritableCloudagentEvents }

  describe('create invitation and check it has been registered in the email server (happy path)', function () {
    setupSmtpTestEnvironment()
    beforeEach(async () => {
      await cleanupDatabase()
      await cleanupCloudagent()
      server = await createHttpServer()
      await post(server.app, '/connection/new/create-invitation', {
        companyNumber: alice.company_number,
        email: 'alice@example.com',
        action: 'submit',
      })
    })

    afterEach(async () => {
      await cleanupDatabase()
      await clearSmtp4devMessages()
      await cleanupCloudagent()
      server.cloudagentEvents.stop()
    })

    it('should send an email via SMTP', async () => {
      const options = {
        hostname: 'localhost',
        port: 5001,
        path: '/api/messages',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }

      const emailCheck = new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => {
            const messages = JSON.parse(data)
            try {
              const parsedMessages = EmailResponseSchema.parse(messages)
              const results = parsedMessages['results']
              expect(results).to.be.an('array')
              expect(results).length(2)

              // Invite email assertions
              const inviteEmail = results.find(
                (msg) =>
                  msg.subject === `${alice.company_name} invites you to a secure, verified connection on Veritable`
              )
              if (inviteEmail) {
                expect(inviteEmail.to).to.have.lengthOf(1)
                expect(inviteEmail).to.deep.contain({
                  isRelayed: false,
                  deliveredTo: 'alice@example.com',
                  from: 'hello@veritable.com',
                  to: ['alice@example.com'],
                  subject: 'DIGITAL CATAPULT invites you to a secure, verified connection on Veritable',
                  attachmentCount: 0,
                  isUnread: true,
                })
              } else {
                throw new Error('No email found with the correct subject.')
              }

              // Admin email assertions
              const adminEmail = results.find(
                (msg) => msg.subject === 'Postal Code for Verification: Invitation from DIGITAL CATAPULT on Veritable'
              )
              if (adminEmail) {
                expect(adminEmail.to).to.have.lengthOf(1)
                expect(adminEmail).to.deep.contain({
                  isRelayed: false,
                  deliveredTo: 'admin@veritable.com',
                  from: 'hello@veritable.com',
                  to: ['admin@veritable.com'],
                  subject: 'Postal Code for Verification: Invitation from DIGITAL CATAPULT on Veritable',
                  attachmentCount: 0,
                  isUnread: true,
                })
              } else {
                throw new Error('No email found with the subject "Postal Code for Verification".')
              }

              resolve(true)
            } catch (error) {
              reject(error)
            }
          })
        })
        req.on('error', (error) => reject(error))
        req.end()
      })

      await emailCheck
    })
  })
})

function setupSmtpTestEnvironment() {
  let username: string | undefined
  let password: string | undefined

  beforeEach(async () => {
    username = process.env.SMTP_USER
    password = process.env.SMTP_PASS

    process.env.EMAIL_TRANSPORT = 'SMTP_EMAIL'
    process.env.SMTP_USER = 'username'
    process.env.SMTP_PASS = 'password'
    resetContainer()
  })

  afterEach(async () => {
    process.env.EMAIL_TRANSPORT = 'STREAM'
    process.env.SMTP_USER = username
    process.env.SMTP_PASS = password
    resetContainer()
  })
}

async function clearSmtp4devMessages() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: '/api/messages/*', // Delete all messages
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    }

    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        resolve(true)
      } else {
        reject(new Error(`Failed to clear messages, status code: ${res.statusCode}`))
      }
    })
    req.on('error', (error) => reject(error))
    req.end()
  })
}
