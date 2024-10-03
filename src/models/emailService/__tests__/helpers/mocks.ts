import { Env, SmtpEnv } from '../../../../env/index.js'

export const mockEnvStream: Env = {
  get: (name: string) => {
    if (name === 'EMAIL_TRANSPORT') return { type: 'STREAM' }
  },
} as Env

export const mockSmtpEnv: SmtpEnv = {
  get: (name: string) => {
    if (name === 'SMTP_HOST') return 'localhost'
    if (name === 'SMTP_PORT') return 2525
    if (name === 'SMTP_SECURE') return false
  },
} as SmtpEnv

export const mockEnvSmtpEmail: Env = {
  get: (name: string) => {
    if (name === 'EMAIL_TRANSPORT') return { type: 'SMTP_EMAIL', config: mockSmtpEnv }
  },
} as Env
