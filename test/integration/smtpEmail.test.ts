import { expect } from 'chai'
import { describe, it } from 'mocha'
import { container } from 'tsyringe'

import http from 'http'
import Database from '../../src/models/db/index.js'
import { RegistryType } from '../../src/models/db/types.js'
import { CountryCode } from '../../src/models/stringTypes.js'
import { testCleanup } from '../helpers/cleanup.js'
import { setupTwoPartyContext, TwoPartyContext } from '../helpers/connection.js'
import { alice } from '../helpers/fixtures.js'
import { post } from '../helpers/routeHelper.js'
import { clearSmtp4devMessages, EmailResponseSchema } from '../helpers/smtpEmails.js'

describe.skip('SMTP email', () => {
  const context: TwoPartyContext = {} as TwoPartyContext
  const username = process.env.SMTP_USER
  const password = process.env.SMTP_PASS

  before(async () => {
    process.env.EMAIL_TRANSPORT = 'SMTP_EMAIL'
    process.env.SMTP_USER = 'username'
    process.env.SMTP_PASS = 'password'
    await setupTwoPartyContext(context)
    // TODO: No idea why Alice's database container needs to be reset for this test to run
    const db = container.resolve(Database)
    container.clearInstances()
    container.register(Database, { useValue: db })
  })

  afterEach(async () => {
    await testCleanup(context.localCloudagent, context.localDatabase)
  })

  after(async () => {
    process.env.EMAIL_TRANSPORT = 'STREAM'
    process.env.SMTP_USER = username
    process.env.SMTP_PASS = password

    context.cloudagentEvents.stop()
    await clearSmtp4devMessages()
  })

  describe('create invitation and check it has been registered in the email server (happy path)', function () {
    beforeEach(async () => {
      await post(context.app, '/connection/new/create-invitation', {
        companyNumber: alice.company_number,
        email: 'alice@testmail.com',
        action: 'submit',
        registryCountryCode: 'GB' as CountryCode,
        selectedRegistry: 'company_house' as RegistryType,
      })
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
                  deliveredTo: 'alice@testmail.com',
                  from: 'hello@veritable.com',
                  to: ['alice@testmail.com'],
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
