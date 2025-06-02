import http from 'http'
import { z } from 'zod'

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

// removing smtp4dev url since only one platform
export const smtp4devUrl = process.env.VERITABLE_SMTP_ADDRESS || 'http://localhost:5001'
const { host, port } = getHostPort(smtp4devUrl)

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
async function checkEmails(search: string): Promise<Email> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      port: port,
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

async function extractPin(emailId: string): Promise<string | null> {
  const apiUrl = `${smtp4devUrl}/api/Messages/${emailId}/part/2/content`
  // Fetch the raw email content
  const response = await fetch(apiUrl)
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

async function extractInvite(emailId: string): Promise<string | null> {
  const apiUrl = `${smtp4devUrl}/api/Messages/${emailId}/plaintext`
  const response = await fetch(apiUrl)
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

async function findNewAdminEmail(oldAdminEmailId: string): Promise<Email> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      port: port,
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

function getHostPort(url: string): { host: string | null; port: string | null } {
  const indexOfDoubleSlash = url.indexOf('//')
  const hostAndPort = url.substring(indexOfDoubleSlash + 2)
  const hostPortArr = hostAndPort.split(':')
  const host = hostPortArr[0]
  const port = hostPortArr[1]
  if (host === null || port === null) {
    throw new Error(`Unspecified smtp4dev host or port ${smtp4devUrl}`)
  }
  return { host, port }
}

export { checkEmails, extractInvite, extractPin, findNewAdminEmail, getHostPort }
