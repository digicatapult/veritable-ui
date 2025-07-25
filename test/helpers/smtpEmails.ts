import http from 'http'
import { z } from 'zod'

const ToSchema = z.array(z.string())

const EmailItemSchema = z.object({
  isRelayed: z.boolean(),
  deliveredTo: z.email(),
  id: z.uuid(),
  from: z.email(),
  to: ToSchema,
  receivedDate: z.iso.datetime(),
  subject: z.string(),
  attachmentCount: z.number().int(),
  isUnread: z.boolean(),
})

export const EmailResponseSchema = z.object({
  results: z.array(EmailItemSchema),
})

export type Email = {
  isRelayed: boolean
  deliveredTo: string
  id: string
  from: string
  to: string[]
  receivedDate: string
  subject: string
  attachmentCount: number
  isUnread: boolean
}

/**
 * @param search this can be TO or FROM or in subject email address
 * @returns validated Email
 */
export async function checkEmails(search: string): Promise<Email> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: '5001',
      path: `/api/messages?searchTerms=${search}&sortColumn=receivedDate`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', async () => {
        try {
          const messages = JSON.parse(data)
          const parsedMessages = EmailResponseSchema.parse(messages)
          const [email] = parsedMessages.results

          resolve(email)
        } catch (error) {
          reject(error)
        }
      })
    })

    req.on('error', (error) => reject(error))
    req.end()
  })
}

export async function extractPin(emailId: string): Promise<string | null> {
  // Fetch the raw email content
  const response = await fetch(`http://localhost:5001/api/Messages/${emailId}/part/2/content`)
  if (!response.ok) {
    throw new Error(`Error fetching email: ${response.statusText}`)
  }

  const rawEmailContent = await response.text()
  // Regex pattern to find the PIN
  const pinPattern = /\d{6}/g
  const match = rawEmailContent.match(pinPattern)

  if (match && match[0]) {
    return match[0]
  } else {
    return null
  }
}

export async function extractInvite(emailId: string): Promise<string | null> {
  const response = await fetch(`http://localhost:5001/api/Messages/${emailId}/plaintext`)
  if (!response.ok) {
    throw new Error(`Error fetching email: ${response.statusText}`)
  }
  const rawEmailContent = await response.text()
  // Regex pattern to find the base64 string
  const base64Pattern = /(eyJ[a-zA-Z0-9\-_]+)\s*$/
  const match = rawEmailContent.match(base64Pattern)

  if (match && match[1]) {
    return match[1]
  } else {
    return null
  }
}

export async function findNewAdminEmail(oldAdminEmailId: string): Promise<Email> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: '5001',
      path: '/api/messages',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', async () => {
        try {
          const messages = JSON.parse(data)
          const parsedMessages = EmailResponseSchema.parse(messages)
          const results = parsedMessages.results

          if (!Array.isArray(results)) {
            return reject(new Error('Unexpected response format, expected an array of messages.'))
          }

          const newAdminEmail = results.find(
            (msg: Email) => msg.subject === 'Postal Code for Verification:' && msg.id !== oldAdminEmailId
          )

          if (!newAdminEmail) {
            return reject(new Error('New admin email not found or it has the same ID as the old one.'))
          }

          resolve(newAdminEmail)
        } catch (error) {
          reject(error)
        }
      })
    })

    req.on('error', (error) => reject(error))
    req.end()
  })
}

export async function clearSmtp4devMessages() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: '5001',
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
