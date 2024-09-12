import express from 'express'
import http from 'http'
import { resetContainer } from '../../src/ioc.js'
import createHttpServer from '../../src/server.js'
import VeritableCloudagentEvents from '../../src/services/veritableCloudagentEvents.js'
import { cleanupCloudagent } from '../helpers/cloudagent.js'
import { cleanup } from '../helpers/db.js'
import { delay } from '../helpers/util.js'
import { validCompanyNumber } from './fixtures'
import { post } from './routeHelper'

export function setupSmtpTestEnvironment(server: {
  app: express.Express
  cloudagentEvents: VeritableCloudagentEvents
}) {
  beforeEach(async () => {
    process.env.EMAIL_TRANSPORT = 'SMTP_EMAIL'
    resetContainer()
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
    await cleanup()
    await clearSmtp4devMessages()
    await cleanupCloudagent()
    server.cloudagentEvents.stop()
    process.env.EMAIL_TRANSPORT = 'STREAM'
    resetContainer()
  })

  return server // Return server so that it can be used in the tests
}

export async function clearSmtp4devMessages() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
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
