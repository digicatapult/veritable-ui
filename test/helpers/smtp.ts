import http from 'http'
import { resetContainer } from '../../src/ioc.js'

export function setupSmtpTestEnvironment() {
  beforeEach(async () => {
    process.env.EMAIL_TRANSPORT = 'SMTP_EMAIL'
    resetContainer()
  })

  afterEach(async () => {
    process.env.EMAIL_TRANSPORT = 'STREAM'
    resetContainer()
  })
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
