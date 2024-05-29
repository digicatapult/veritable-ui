import { expect } from 'chai'
import { describe } from 'mocha'

import pino from 'pino'
import sinon from 'sinon'

import { Env } from '../../../env.js'

import EmailService from '../index.js'

const mockEnv: Env = {
  get: (name: string) => {
    if (name === 'EMAIL_TRANSPORT') return 'STREAM'
  },
} as Env

const mkMockLogger = () => {
  const logger = {
    info: sinon.stub<Parameters<pino.LogFn>, ReturnType<pino.LogFn>>(),
    debug: sinon.stub<Parameters<pino.LogFn>, ReturnType<pino.LogFn>>(),
  }
  return logger
}

const mockTemplates = {
  connection_invite: () => Promise.resolve({}),
  connection_invite_admin: () => Promise.resolve({}),
}

describe('EmailService', () => {
  describe('sendMail', () => {
    it('should log message details', async () => {
      const logger = mkMockLogger()
      const emailService = new EmailService(mockEnv, mockTemplates, logger as unknown as pino.Logger)

      await emailService.sendMail('connection_invite', { to: 'user@example.com', invite: '1234567890987654321' })

      expect(logger.info.callCount).to.equal(1)
      expect(logger.debug.callCount).to.equal(2)
    })
  })
})
