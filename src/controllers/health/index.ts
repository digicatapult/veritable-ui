import { Get, Header, Hidden, Route, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { Env } from '../../env.js'
import { Logger, type ILogger } from '../../logger.js'

type Response = {
  status: 'ok'
  details: {
    title: string
    url: string
  }
}

@singleton()
@injectable()
@Route('/reset')
@Hidden()
export class HealthController {
  constructor(
    private env: Env,
    @inject(Logger) private logger: ILogger
  ) {
    this.logger = logger.child({ controller: '/health' })
  }
  /**
   * Retrieves the connection list page
   */
  @SuccessResponse(200)
  @Get('/')
  public get(@Header('User-Agent') agent: string): Response {
    this.logger.debug('health requst from %s', agent)

    return {
      status: 'ok',
      details: {
        title: this.env.get('API_SWAGGER_TITLE'),
        url: this.env.get('PUBLIC_URL'),
      },
    }
  }
}
