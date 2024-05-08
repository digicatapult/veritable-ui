import { Get, Produces, Route, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { Logger, type ILogger } from '../../logger.js'
import Database from '../../models/db/index.js'
import ConnectionTemplates from '../../views/connection.js'
import { HTML, HTMLController } from '../HTMLController.js'

@singleton()
@injectable()
@Route('/connection')
@Produces('text/html')
export class ConnectionController extends HTMLController {
  constructor(
    private db: Database,
    private connectionTemplates: ConnectionTemplates,
    @inject(Logger) private logger: ILogger
  ) {
    super()
    this.logger = logger.child({ controller: '/' })
  }

  /**
   * Retrieves the connection list page
   */
  @SuccessResponse(200)
  @Get('/')
  public async listConnections(): Promise<HTML> {
    this.logger.debug('connections page requested')
    const connections = await this.db.get('connection', {}, [['updated_at', 'desc']])
    return this.html(this.connectionTemplates.listPage(connections))
  }
}
