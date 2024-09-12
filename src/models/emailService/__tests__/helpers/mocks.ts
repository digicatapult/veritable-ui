import { Env } from '../../../../env.js'

export const mockEnvStream: Env = {
  get: (name: string) => {
    if (name === 'EMAIL_TRANSPORT') return 'STREAM'
  },
} as Env

export const mockEnvSmtpEmail: Env = {
  get: (name: string) => {
    if (name === 'EMAIL_TRANSPORT') return 'SMTP_EMAIL'
  },
} as Env
