import { expect } from 'chai'
import express from 'express'
import { describe, it } from 'mocha'
import { pino } from 'pino'
import { Env } from '../../../env.js'
import { BasicLogger } from '../../../logger.js'

import { HealthController } from '../index.js'

const mockLogger: BasicLogger = pino({ level: 'silent' }).child({ HealthController: 'UNIT:TEST' })
const mockEnv = {
  get: (name: string) => {
    if (name === 'PUBLIC_URL') return 'http://www.exampl.com'
    if (name === 'API_SWAGGER_TITLE') return 'veritable-ui-unit-test'
    return ''
  },
} as Env

describe('HealthController', () => {
  it('returns status ok along with title and public url', async () => {
    const controller = new HealthController(mockEnv)
    const res = controller.get({
      log: mockLogger,
      headers: { 'user-agent': 'unit-test-agent' },
    } as unknown as express.Request)

    expect(res).to.deep.equal({
      status: 'ok',
      details: {
        title: 'veritable-ui-unit-test',
        url: 'http://www.exampl.com',
      },
    })
  })
})
