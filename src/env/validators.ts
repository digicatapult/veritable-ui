import envalid from 'envalid'
import { container } from 'tsyringe'

import { SmtpEnv } from './smtp.js'

export const strArrayValidator = envalid.makeValidator((input) => {
  const arr = input
    .split(',')
    .map((s) => s.trim())
    .filter((s) => !!s)

  const first = arr.shift()
  if (first === undefined) {
    throw new Error('must provide at least one cookie signing key')
  }
  const res: [string, ...string[]] = [first, ...arr]
  return res
})

export const issuanceRecordValidator = envalid.makeValidator((input) => {
  if (input === 'CREATE_NEW') {
    return 'CREATE_NEW' as const
  }

  if (input === 'FIND_EXISTING') {
    return 'FIND_EXISTING' as const
  }

  if (input === 'EXISTING_OR_NEW') {
    return 'EXISTING_OR_NEW' as const
  }

  if (input.match(/^did:/)) {
    return input as `did:${string}`
  }
  if (input.match(/^ipfs:\/\//)) {
    return input as `ipfs://${string}`
  }

  throw new Error('must supply a valid issuance policy')
})

export const pinSecretValidator = envalid.makeValidator((input) => {
  if (!input) {
    throw new Error('Invalid pin secret value')
  }

  return Buffer.from(input, 'utf8')
})

export const emailTransportValidator = envalid.makeValidator((input: string) => {
  if (input === 'STREAM') {
    return {
      type: 'STREAM' as const,
    }
  }

  if (input === 'SMTP_EMAIL') {
    const config = container.resolve(SmtpEnv)
    return {
      type: 'SMTP_EMAIL' as const,
      config,
    }
  }

  throw new Error(`Invalid transport ${input} provided. Valid values are ["STREAM", "SMTP_EMAIL"]`)
})
