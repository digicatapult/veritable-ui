import { inject, injectable, singleton } from 'tsyringe'
import { Env } from '../../env/index.js'
import { type ILogger, Logger } from '../../logger.js'
import { EmailServiceInt } from '../emailServiceInt/index.js'
import Templates from '../emailServiceInt/templates/index.js'

@singleton()
@injectable()
export default class EmailService extends EmailServiceInt {
  constructor(env: Env, templates: Templates, @inject(Logger) logger: ILogger) {
    super(env, templates, logger)
  }
}
