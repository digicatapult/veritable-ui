import { Readable } from 'node:stream'

import pino from 'pino'

import { Env } from '../../env.js'
import Counter from '../../models/counter.js'
import RootTemplates from '../../views/example.js'

export const templateMock = {
  Root: (s: string) => `root_${s}_root`,
  Counter: () => `counter`,
  Button: ({ disabled }) => `button_${disabled}_button`,
} as RootTemplates

export const mockLogger = pino({ level: 'silent' })

export const mockEnv = {
  get: (name: string) => {
    if (name === 'PUBLIC_URL') return 'http://www.example.com'
    if (name === 'IDP_CLIENT_ID') return 'veritable-ui'
    return ''
  },
} as Env

export const counterMock = {
  get: () => 42,
  increment: () => 43,
} as Counter

export const toHTMLString = async (stream: Readable) => {
  const chunks: Uint8Array[] = []
  for await (const chunk of stream) {
    chunks.push(chunk as Uint8Array)
  }
  return Buffer.concat(chunks).toString('utf8')
}
