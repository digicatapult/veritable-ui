import { Post, Body, Path, Get, Produces, Query, Route, Security, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'
import { z } from 'zod'

import ConnectionTemplates from '../../views/connection/connection.js'
import type { UUID } from '../../models/strings.js'

import { NotFoundError } from '../../errors.js'
import { Logger, type ILogger } from '../../logger.js'
import Database from '../../models/db/index.js'
import { ConnectionRow } from '../../models/db/types.js'
import { FromInviteTemplates } from '../../views/newConnection/fromInvite.js'
import { NewInviteTemplates } from '../../views/newConnection/newInvite.js'
import { PinSubmissionTemplates } from '../../views/newConnection/pinSubmission.js'
import { HTML, HTMLController } from '../HTMLController.js'


const inviteParser = z.object({
  companyNumber: z.string(),
  inviteUrl: z.string(),
})

type Invite = z.infer<typeof inviteParser>

@singleton()
@injectable()
@Security('oauth2')
@Route('/connection')
@Produces('text/html')
export class ConnectionController extends HTMLController {
  constructor(
    private db: Database,
    private connectionTemplates: ConnectionTemplates,
    private newInvite: NewInviteTemplates,
    private fromInvite: FromInviteTemplates,
    private pinSubmission: PinSubmissionTemplates,
    @inject(Logger) private logger: ILogger
  ) {
    super()
    this.logger = logger.child({ controller: '/conecttion' })
  }

  /**
   * Retrieves the connection list page
   */
  @SuccessResponse(200)
  @Get('/')
  public async listConnections(@Query() search?: string): Promise<HTML> {
    this.logger.debug('connections page requested')
    const query = search ? [['company_name', 'ILIKE', `%${search}%`]] : {}
    const connections = await this.db.get('connection', query, [['updated_at', 'desc']])

    this.setHeader('HX-Replace-Url', search ? `/connection?search=${encodeURIComponent(search)}` : `/connection`)
    return this.html(this.connectionTemplates.listPage(connections, search))
  }

  /**
   *
   * @returns The new connections form page
   */
  @SuccessResponse(200)
  @Get('/')
  public async newConnectionForm(@Query() fromInvite: boolean = false): Promise<HTML> {
    if (fromInvite) {
      return this.html(
        this.fromInvite.fromInviteFormPage({
          type: 'message',
          message: 'Please paste the invite text from the invitation email',
        })
      )
    }

    return this.html(
      this.newInvite.newInviteFormPage({
        type: 'message',
        message: 'Please type in a valid company number to populate information',
      })
    )
  }

  /**
   * render pin code submission form
   * @param companyNumber - for retrieving a connection from a db
   * @param pin - a pin code
   * @returns
   */
    @SuccessResponse(200)
    @Get('/{connectionId}/pin-submission')
    public async renderPinCode(@Path() connectionId: UUID, @Query() pin?: string): Promise<HTML> {
      this.logger.debug('PIN_SUBMISSION GET: %o', { connectionId, pin })
  
      return this.html(this.pinSubmission.renderPinForm(connectionId, pin || ''))
    }
  
    /**
     * handles PIN code submission form submit action
     * @param body - contains forms inputs
     * @returns
     */
    @SuccessResponse(200)
    @Post('/{connectionId}/pin-submission')
    public async submitPinCode(
      @Body() body: { action: 'submitPinCode'; pin: string },
      @Path() connectionId: UUID
    ): Promise<HTML> {
      this.logger.debug('PIN_SUBMISSION POST: %o', { body })
      const { pin, action } = body
  
      const [connection]: ConnectionRow[] = await this.db.get('connection', { id: connectionId })
  
      if (!connection) throw new NotFoundError(`[connection: ${connectionId}`)
      await this.verifyReceiveConnection(connection, pin)
  
      return this.html(this.pinSubmission.renderSuccess(action, pin, connection.company_name))
    }

  private async verifyReceiveConnection(connection: ConnectionRow, pin: string) {
    await this.db.withTransaction(async (db) => {
      if (!connection) {
        return this.logger.error('Unknown connection associated with companyNumber %s', connection)
      }

      if (!pin) {
        return this.logger.error('pin not provided in this request')
      }

      // handlePin using credentials
      await db.update('connection', { id: connection.id }, { status: 'pending' })
    })
  }

}
