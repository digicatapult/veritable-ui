import { expect } from 'chai'
import { describe } from 'mocha'

import pino from 'pino'
import sinon from 'sinon'

import nodemailer from 'nodemailer'

import type { ILogger } from '../../../logger.js'
import EmailService from '../../emailService/index.js'
import { mockEnvSmtpEmail, mockEnvStream } from './helpers/mocks.js'

const mkMockLogger = () => {
  const logger = {
    info: sinon.stub<Parameters<pino.LogFn>, ReturnType<pino.LogFn>>(),
    debug: sinon.stub<Parameters<pino.LogFn>, ReturnType<pino.LogFn>>(),
    trace: sinon.stub<Parameters<pino.LogFn>, ReturnType<pino.LogFn>>(),
  }
  return logger
}

const mockTemplates = {
  connection_invite: () => Promise.resolve({}),
  connection_invite_admin: () => Promise.resolve({}),
}

describe('EmailService', () => {
  describe('sendMail', () => {
    it('STREAM:should log message details', async () => {
      const logger = mkMockLogger()
      const emailService = new EmailService(mockEnvStream, mockTemplates, logger as unknown as ILogger)

      await emailService.sendMail('connection_invite', {
        to: 'user@example.com',
        invite: '1234567890987654321',
        toCompanyName: 'example-to',
        fromCompanyName: 'example-from',
      })

      expect(logger.info.callCount).to.equal(1)
      expect(logger.debug.callCount).to.equal(3)
    })
  })

  describe('sendMail: SMTP', () => {
    let sendMailStub: sinon.SinonStub
    beforeEach(() => {
      sendMailStub = sinon.stub().resolves({
        messageId: '12345',
        envelope: { from: 'hello@veritable.com', to: ['user@example.com'] },
        response: '250 OK',
      })
      // Mock nodemailer.createTransport
      sinon.stub(nodemailer, 'createTransport').returns({
        sendMail: sendMailStub,
        verify: sinon.stub().yields(null, true), // Simulate a successful SMTP connection
      } as unknown as nodemailer.Transporter)
    })
    afterEach(() => {
      sinon.restore()
    })
    it('SMTP_EMAIL:should log message details', async () => {
      const logger = mkMockLogger()
      const emailService = new EmailService(mockEnvSmtpEmail, mockTemplates, logger as unknown as ILogger)

      await emailService.sendMail('connection_invite', {
        to: 'user@example.com',
        invite: '1234567890987654321',
        toCompanyName: 'example-to',
        fromCompanyName: 'example-from',
      })

      expect(logger.info.callCount).to.equal(1)
      expect(logger.debug.callCount).to.equal(3)
      expect(logger.trace.callCount).to.equal(2)
    })
  })
})
