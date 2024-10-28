import { inject, injectable, singleton } from 'tsyringe'
import { Env } from '../../env'
import { type ILogger, Logger } from '../../logger'
import { EmailServiceInt } from '../emailServiceInt'
import Templates from '../emailServiceInt/templates'

@singleton()
@injectable()
export default class EmailService extends EmailServiceInt {
  constructor(env: Env, templates: Templates, @inject(Logger) logger: ILogger) {
    super(env, templates, logger)
  }
}
