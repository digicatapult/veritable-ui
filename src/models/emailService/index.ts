import nodemailer, { SendMailOptions } from 'nodemailer'
import { inject, injectable, singleton } from 'tsyringe'

import { Env } from '../../env.js'
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
    switch (this.env.get('EMAIL_TRANSPORT')) {
      case 'STREAM':
        return this.buildStreamTransport()
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

  async sendMail<T extends templateName>(name: T, ...params: templateParams[T]): Promise<void> {
    const mail = await this.templates[name](this.env, ...params)
    await this.transportSendMail(mail)
  }
}
