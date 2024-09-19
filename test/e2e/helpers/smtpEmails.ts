import { expect } from '@playwright/test'
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

async function checkEmails(): Promise<{ inviteEmail: Email; adminEmail: Email }> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
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

          expect(Array.isArray(results)).toBeTruthy()
          expect(results).toHaveLength(2)
          // Get the adminEmail and inviteEmail from validateEmails
          console.log(results)
          const { inviteEmail, adminEmail } = await validateEmails(results)

          resolve({ inviteEmail, adminEmail })
        } catch (error) {
          reject(error)
        }
      })
    })

    req.on('error', (error) => reject(error))
    req.end()
  })
}

// Function that checks specific email content and returns both emails
async function validateEmails(results: Email[]): Promise<{
  inviteEmail: Email
  adminEmail: Email
}> {
  // Invite email assertions
  const inviteEmail = results.find((msg) => msg.subject === 'Veritable invite')
  if (inviteEmail) {
    expect(inviteEmail.to).toHaveLength(1)
    expect(inviteEmail.to[0]).toContain('alice@testmail.com')
  } else {
    throw new Error('No email found with the subject "Veritable invite".')
  }

  // Admin email assertions
  const adminEmail = results.find((msg) => msg.subject === 'Action required: process veritable invitation')
  if (adminEmail) {
    expect(adminEmail.to).toHaveLength(1)
    expect(adminEmail.to[0]).toContain('admin@veritable.com')
  } else {
    throw new Error('No email found with the subject "Action required: process veritable invitation".')
  }

  // Return both email objects
  return { inviteEmail, adminEmail }
}

async function extractPin(emailId: string): Promise<string | null> {
  const apiUrl = `http://localhost:5000/api/messages/${emailId}/raw`

  try {
    // Fetch the raw email content
    const response = await fetch(apiUrl)
    if (!response.ok) {
      throw new Error(`Error fetching email: ${response.statusText}`)
    }

    const rawEmailContent = await response.text()

    // Regex pattern to find the PIN
    const pinPattern = /PIN:\s*(\d+)/
    const match = rawEmailContent.match(pinPattern)

    // Return the PIN if found
    if (match && match[1]) {
      return match[1]
    } else {
      return null // Return null if PIN is not found
    }
  } catch (error) {
    console.error('Failed to fetch email content:', error)
    throw error // Rethrow the error to propagate it
  }
}

async function extractInvite(emailId: string): Promise<string | null> {
  const apiUrl = `http://localhost:5000/api/messages/${emailId}/raw`

  try {
    const response = await fetch(apiUrl)
    if (!response.ok) {
      throw new Error(`Error fetching email: ${response.statusText}`)
    }

    const rawEmailContent = await response.text()
    // Regex pattern to find the base64 string
    const base64Pattern = /<p>(eyJ[^<]+)<\/p>/
    const match = rawEmailContent.match(base64Pattern)

    if (match && match[1]) {
      const cleanedString = match[1]
        .replace(/\s+/g, '') // Remove all whitespace including line breaks
        .replace(/=/g, '') // Remove equal signs

      return cleanedString
    } else {
      return null
    }
  } catch (error) {
    console.error('Failed to fetch email content:', error)
    throw error
  }
}

async function findNewAdminEmail(oldAdminEmailId: string): Promise<Email> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
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
          console.log(oldAdminEmailId)
          const messages = JSON.parse(data)
          const parsedMessages = EmailResponseSchema.parse(messages)
          const results = parsedMessages.results
          console.log(results)

          if (!Array.isArray(results)) {
            return reject(new Error('Unexpected response format, expected an array of messages.'))
          }

          const newAdminEmail = results.find(
            (msg: Email) =>
              msg.subject === 'Action required: process veritable invitation' && msg.id !== oldAdminEmailId
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

export { checkEmails, extractInvite, extractPin, findNewAdminEmail }
