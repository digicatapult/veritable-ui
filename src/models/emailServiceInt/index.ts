import nodemailer, { SendMailOptions } from 'nodemailer'

import { Env, SmtpEnv } from '../../env/index.js'
import { type ILogger } from '../../logger.js'

import Templates, { templateHandlers, templateName, templateParams } from './templates/index.js'

export class EmailServiceInt {
  private templates: templateHandlers
  private transportSendMail: nodemailer.Transporter['sendMail']

  constructor(
    private env: Env,
    templates: Templates,
    private logger: ILogger
  ) {
    this.templates = templates
    this.transportSendMail = this.buildTransport()
  }
  private buildTransport(): typeof this.transportSendMail {
    const logger = this.logger
    const config = this.env.get('EMAIL_TRANSPORT')
    switch (config.type) {
      case 'STREAM':
        logger.debug('Initialising EMAIL_TRANSPORT of type: STREAM')
        return this.buildStreamTransport()
      case 'SMTP_EMAIL':
        logger.debug('Initialising EMAIL_TRANSPORT of type: SMTP_EMAIL')
        return this.buildSmtpTransport(config.config)
      default:
        throw new Error('Unsupported email transport type')
    }
  }
  private buildStreamTransport(): typeof this.transportSendMail {
    const transport = nodemailer.createTransport({
      streamTransport: true,
      buffer: true,
      newline: 'unix',
    })
    const logger = this.logger
    return async function sendMail(this: typeof transport, options: SendMailOptions) {
      const info = await this.sendMail(options)

      logger.info('Sending email with message id %s', info.messageId)
      logger.debug(`email envelope %s (from: %s, to %s)`, info.messageId, info.envelope.from, info.envelope.to)
      logger.debug(`email contents %s: %s`, info.messageId, info.message.toString('utf8'))

      return info
    }.bind(transport)
  }
  private buildSmtpTransport(smtpTransportConfig: SmtpEnv): typeof this.transportSendMail {
    const user = smtpTransportConfig.get('SMTP_USER')
    const pass = smtpTransportConfig.get('SMTP_PASS')
    const auth = user && pass ? { user, pass } : {}
    const options = {
      host: smtpTransportConfig.get('SMTP_HOST'),
      port: smtpTransportConfig.get('SMTP_PORT'),
      secure: smtpTransportConfig.get('SMTP_SECURE'), // true for 465, false for other ports
      auth,
    }
    const transport = nodemailer.createTransport(options)
    const logger = this.logger
    logger.debug(
      `Initialising with SMTP_HOST: ${smtpTransportConfig.get('SMTP_HOST')}, SMTP_PORT: ${smtpTransportConfig.get('SMTP_PORT')}, SMTP_SECURE:${smtpTransportConfig.get('SMTP_SECURE')}`
    )
    // Verify connection
    transport.verify(function (error, success) {
      if (error) {
        logger.debug(`SMTP connection failed: ${error}`)
        throw error
      } else {
        logger.debug(`SMTP server is ready to take messages: ${success}`)
      }
    })

    return async function sendMail(this: typeof transport, options: SendMailOptions) {
      const info = await this.sendMail(options)

      logger.info('Sending email via SMTP with message id %s', info.messageId)
      logger.trace('email envelope %s (from: %s, to: %s)', info.messageId, info.envelope.from, info.envelope.to)
      logger.trace('email contents %s: %s', info.messageId, info.response.toString())

      return info
    }.bind(transport)
  }

  async sendMail<T extends templateName>(name: T, ...params: templateParams[T]): Promise<void> {
    const mail = await this.templates[name](this.env, ...params)
    await this.transportSendMail(mail)
  }
}
