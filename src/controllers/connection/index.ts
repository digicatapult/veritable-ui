import { Body, Get, Post, Produces, Route, Security, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { Logger, type ILogger } from '../../logger.js'
import Database from '../../models/db/index.js'
import ConnectionTemplates from '../../views/connection.js'
import { HTML, HTMLController } from '../HTMLController.js'

type ConnectionStatus = 'pending' | 'unverified' | 'verified_them' | 'verified_us' | 'verified_both' | 'disconnected'

@singleton()
@injectable()
@Security('oauth2')
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

  /**
   * Returns searched connections
   */
  @SuccessResponse(200)
  @Post('/search')
  public async searchConnections(@Body() body: { search: string }): Promise<HTML> {
    const search = body['search']
    this.logger.debug('searched connections page requested')
    const connections = await this.db.search('connection', search.toLowerCase(), {}, [['updated_at', 'desc']])

    return this.html(this.connectionTemplates.connectionTableBody(connections))
  }
}
