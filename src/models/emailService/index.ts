import nodemailer, { SendMailOptions } from 'nodemailer'
import { container, inject, injectable, singleton } from 'tsyringe'

import { Env, SmtpEnv } from '../../env.js'
import { Logger, type ILogger } from '../../logger.js'

import Templates, { templateHandlers, templateName, templateParams } from './templates/index.js'

@singleton()
@injectable()
export default class EmailService {
  private templates: templateHandlers
  private transportSendMail: nodemailer.Transporter['sendMail']

  constructor(
    private env: Env,
    templates: Templates,
    @inject(Logger) private logger: ILogger
  ) {
    this.templates = templates
    this.transportSendMail = this.buildTransport()
  }

  private buildTransport(): typeof this.transportSendMail {
    const logger = this.logger
    switch (this.env.get('EMAIL_TRANSPORT')) {
      case 'STREAM':
        logger.debug('Initialising EMAIL_TRANSPORT of type: STREAM')
        return this.buildStreamTransport()
      case 'SMTP_EMAIL':
        logger.debug('Initialising EMAIL_TRANSPORT of type: SMTP_EMAIL')
        return this.buildSmtpTransport()
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
  private buildSmtpTransport(): typeof this.transportSendMail {
    const smtpTransportConfig = container.resolve(SmtpEnv)
    const transport = nodemailer.createTransport({
      host: smtpTransportConfig.get('SMTP_HOST'),
      port: parseInt(smtpTransportConfig.get('SMTP_PORT'), 10),
      secure: smtpTransportConfig.get('SMTP_SECURE'), // true for 465, false for other ports
    })
    const logger = this.logger
    logger.debug(
      `Initialising with SMTP_HOST: ${smtpTransportConfig.get('SMTP_HOST')}, SMTP_PORT: ${smtpTransportConfig.get('SMTP_PORT')}, SMTP_SECURE:${smtpTransportConfig.get('SMTP_SECURE')}`
    )
    // Verify connection
    transport.verify(function (error, success) {
      if (error) {
        logger.debug(`SMTP connection failed: ${error}`)
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
