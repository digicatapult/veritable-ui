import { Readable } from 'node:stream'
import { pino } from 'pino'

import { Env } from '../../env/index.js'

export const mockLogger = pino({ level: 'debug' }) // TODO: change back to silent

export const mockEnv = {
  get: (name: string) => {
    if (name === 'PUBLIC_URL') return 'http://www.example.com'
    if (name === 'IDP_CLIENT_ID') return 'veritable-ui'
    return ''
  },
} as Env

export const mockEnvLocalhost = {
  get: (name: string) => {
    if (name === 'PUBLIC_URL') return 'http://localhost:3000'
    if (name === 'IDP_CLIENT_ID') return 'veritable-ui'
    return ''
  },
} as Env

export const toHTMLString = async (stream: Readable) => {
  const chunks: Uint8Array[] = []
  for await (const chunk of stream) {
    chunks.push(chunk as Uint8Array)
  }
  return Buffer.concat(chunks).toString('utf8')
}
