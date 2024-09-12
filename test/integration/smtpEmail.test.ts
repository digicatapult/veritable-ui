import { expect } from 'chai'
import express from 'express'
import { describe, it } from 'mocha'

import http from 'http'
import { z } from 'zod'
import VeritableCloudagentEvents from '../../src/services/veritableCloudagentEvents.js'
import { withCompanyHouseMock } from '../helpers/companyHouse.js'
import { setupSmtpTestEnvironment } from '../helpers/smtp.js'

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

  withCompanyHouseMock()

  describe('create invitation and check it has been registered in the email server (happy path)', function () {
    server = setupSmtpTestEnvironment(server)

    it('should send an email via SMTP', async () => {
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
                throw new Error('No email found with the subject "Action required: process veritable invitation".')
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
