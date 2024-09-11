import { expect } from 'chai'
import express from 'express'
import { afterEach, beforeEach, describe, it } from 'mocha'

import http from 'http'
import { container } from 'tsyringe'
import { z } from 'zod'
import { Env } from '../../src/env.js'
import { resetContainer } from '../../src/ioc.js'
import createHttpServer from '../../src/server.js'
import VeritableCloudagentEvents from '../../src/services/veritableCloudagentEvents.js'
import { cleanupCloudagent } from '../helpers/cloudagent.js'
import { withCompanyHouseMock } from '../helpers/companyHouse.js'
import { cleanup } from '../helpers/db.js'
import { validCompanyNumber } from '../helpers/fixtures.js'
import { post } from '../helpers/routeHelper.js'
import { delay } from '../helpers/util.js'

const ToSchema = z.array(z.string())

const EmailItemSchema = z.object({
  isRelayed: z.boolean(),
  deliveredTo: z.string().email(), // Ensure this is a valid email address
  id: z.string().uuid(), // Ensure this is a valid UUID
  from: z.string().email(),
  to: ToSchema,
  receivedDate: z.string().datetime(), // Ensure this is a valid datetime string
  subject: z.string(),
  attachmentCount: z.number().int(),
  isUnread: z.boolean(),
})
const EmailResponseSchema = z.object({
  results: z.array(EmailItemSchema),
})

describe('SMTP email', () => {
  let server: { app: express.Express; cloudagentEvents: VeritableCloudagentEvents }
  afterEach(async () => {
    await cleanup()
    await clearSmtp4devMessages()
  })
  withCompanyHouseMock()

  describe('create invitation and check it has been registered in the email server (happy path)', function () {
    beforeEach(async () => {
      process.env.EMAIL_TRANSPORT = 'SMTP_EMAIL'
      resetContainer()
      container.registerInstance(Env, new Env())
      await cleanup()
      await cleanupCloudagent()
      server = await createHttpServer()
      await post(server.app, '/connection/new/create-invitation', {
        companyNumber: validCompanyNumber,
        email: 'alice@example.com',
        action: 'submit',
      })

      // Allow time for the email to be sent
      await delay(2000)
    })

    afterEach(async () => {
      await cleanupCloudagent()
      server.cloudagentEvents.stop()
      process.env.EMAIL_TRANSPORT = 'STREAM'
      resetContainer()
    })

    it('should send an email via SMTP', async () => {
      console.log(process.env.EMAIL_TRANSPORT)
      const options = {
        hostname: 'localhost',
        port: 5000,
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
              const inviteEmail = results.find((msg) => msg.subject === 'Veritable invite')
              if (inviteEmail) {
                expect(inviteEmail.to).to.have.lengthOf(1)
                expect(inviteEmail.to[0]).to.contain('alice@example.com')
              } else {
                throw new Error('No email found with the subject "Veritable invite".')
              }

              // Admin email assertions
              const adminEmail = results.find((msg) => msg.subject === 'Action required: process veritable invitation')
              if (adminEmail) {
                expect(adminEmail.to).to.have.lengthOf(1)
                expect(adminEmail.to[0]).to.contain('admin@veritable.com')
              } else {
                throw new Error('No email found with the subject "Veritable invite".')
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

  async function clearSmtp4devMessages() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/messages/*', // Correct endpoint to delete all messages
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
})
