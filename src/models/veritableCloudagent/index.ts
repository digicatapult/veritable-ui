import { inject, injectable, singleton } from 'tsyringe'
import { type PartialEnv } from '../../env/common.js'
import { Env } from '../../env/index.js'
import { type ILogger, Logger } from '../../logger.js'
import VeritableCloudagentInt from '../veritableCloudagentInt.js'

/*
  This has been moved to separate file due to e2e testing. 
  E2e tests in playwright cannot use decorators and have an issue with e.g. @injectable.
  For e2e tests we are using the VeritableCloudagentInt, whereas for the rest of the repo we are using this class.
*/

@singleton()
@injectable()
export default class VeritableCloudagent extends VeritableCloudagentInt {
  constructor(@inject(Env) env: PartialEnv<'CLOUDAGENT_ADMIN_ORIGIN'>, @inject(Logger) logger: ILogger) {
    super(env, logger)
  }
}
