import { Get, Produces, Route, Security, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { Logger, type ILogger } from '../../logger.js'

import QueriesTemplates from '../../views/queries.js'
import { HTML, HTMLController } from '../HTMLController.js'

@singleton()
@injectable()
@Security('oauth2')
@Route('/queries')
@Produces('text/html')
export class QueriesController extends HTMLController {
  constructor(
    private queriesTemplates: QueriesTemplates,
    @inject(Logger) private logger: ILogger
  ) {
    super()
    this.logger = logger.child({ controller: '/' })
  }

  /**
   * Retrieves the homepage
   */
  @SuccessResponse(200)
  @Get('/')
  public async homepage(): Promise<HTML> {
    this.logger.debug('homepagepage requested')

    return this.html(this.queriesTemplates.chooseQueryPage())
  }
}
