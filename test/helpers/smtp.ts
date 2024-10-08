import http from 'http'
import { resetContainer } from '../../src/ioc.js'

export function setupSmtpTestEnvironment() {
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

export async function clearSmtp4devMessages() {
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
