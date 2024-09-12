import { Body, Get, Path, Post, Produces, Query, Route, Security, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { pinCodeRegex, type PIN_CODE, type UUID } from '../../models/strings.js'
import ConnectionTemplates from '../../views/connection/connection.js'

import { DatabaseTimeoutError, InternalError, InvalidInputError, NotFoundError } from '../../errors.js'
import { Logger, type ILogger } from '../../logger.js'
import CompanyHouseEntity, { CompanyProfile } from '../../models/companyHouseEntity.js'
import Database from '../../models/db/index.js'
import { ConnectionRow } from '../../models/db/types.js'
import VeritableCloudagent from '../../models/veritableCloudagent.js'
import { PinSubmissionTemplates } from '../../views/newConnection/pinSubmission.js'
import { HTML, HTMLController } from '../HTMLController.js'
import { checkDb } from './helpers.js'

@singleton()
@injectable()
@Security('oauth2')
@Route('/connection')
@Produces('text/html')
export class ConnectionController extends HTMLController {
  constructor(
    private db: Database,
    private cloudagent: VeritableCloudagent,
    private companyHouse: CompanyHouseEntity,
    private connectionTemplates: ConnectionTemplates,
    private pinSubmission: PinSubmissionTemplates,
    @inject(Logger) private logger: ILogger
  ) {
    super()
    this.logger = logger.child({ controller: '/connection' })
  }

  /**
   * Retrieves the connection list page
   */
  @SuccessResponse(200)
  @Get('/')
  public async listConnections(@Query() search: string = ''): Promise<HTML> {
    const connections =
      search !== ''
        ? await this.db.get('connection', [['company_name', 'ILIKE', `%${search}%`]], [['updated_at', 'desc']])
        : await this.db.get('connection', {}, [['updated_at', 'desc']])

    this.setHeader('HX-Replace-Url', search ? `/connection?search=${encodeURIComponent(search)}` : `/connection`)
    return this.html(this.connectionTemplates.listPage(connections, search))
  }

  /**
   * render pin code submission form
   * @param companyNumber - for retrieving a connection from a db
   * @param pin - a pin code
   * @returns
   */
  @SuccessResponse(200)
  @Get('/{connectionId}/pin-submission')
  public async renderPinCode(@Path() connectionId: UUID, @Query() pin?: PIN_CODE | string): Promise<HTML> {
    this.logger.debug('PIN_SUBMISSION GET: %o', { connectionId, pin })

    const [connection]: ConnectionRow[] = await this.db.get('connection', { id: connectionId })
    if (!connection) {
      throw new NotFoundError(`[connection]: ${connectionId}`)
    }

    return this.html(this.pinSubmission.renderPinForm({ connectionId, pin: pin ?? '', continuationFromInvite: false }))
  }

  /**
   * handles PIN code submission form submit action
   * @param body - contains forms inputs
   * @returns
   */
  @SuccessResponse(200)
  @Post('/{connectionId}/pin-submission')
  public async submitPinCode(
    @Body() body: { action: 'submitPinCode'; pin: PIN_CODE | string; stepCount?: number },
    @Path() connectionId: UUID
  ): Promise<HTML> {
    this.logger.debug('PIN_SUBMISSION POST: %o', { body })
    const { pin } = body

    if (!pin.match(pinCodeRegex)) {
      return this.html(this.pinSubmission.renderPinForm({ connectionId, pin, continuationFromInvite: false }))
    }

    const profile = await this.companyHouse.localCompanyHouseProfile()

    const [connection]: ConnectionRow[] = await this.db.get('connection', { id: connectionId })

    if (!connection) throw new NotFoundError(`[connection]: ${connectionId}`)

    const agentConnectionId = connection.agent_connection_id
    if (!agentConnectionId) throw new InvalidInputError('Cannot verify PIN on a pending connection')
    //check initial db state of pin_tries_remaining_counts

    await this.verifyReceiveConnection(agentConnectionId, profile, pin)

    // loading spinner for htmx
    const localPinAttemptCount = await this.pollPinSubmission(connectionId, connection.pin_tries_remaining_count)

    if (localPinAttemptCount.nextScreen === 'success') {
      this.logger.debug('Rendering sucess screen')

      return this.html(
        this.pinSubmission.renderSuccess({ companyName: connection.company_name, stepCount: body.stepCount ?? 2 })
      )
    }
    if (localPinAttemptCount.nextScreen === 'error') {
      this.logger.debug('Render error screen with message coming from poll Pin submission')

      return this.html(
        this.pinSubmission.renderError({
          companyName: connection.company_name,
          stepCount: body.stepCount ?? 2,
          errorMessage: localPinAttemptCount.message,
        })
      )
    }
    //at this point this can only be form
    return this.html(
      this.pinSubmission.renderPinForm({
        connectionId,
        pin,
        continuationFromInvite: false,
        remainingTries: localPinAttemptCount.message,
      })
    )
  }

  private async verifyReceiveConnection(agentConnectionId: string, profile: CompanyProfile, pin: string) {
    this.logger.trace('verifyReceiveConnection(): called', { agentConnectionId, profile, pin })

    await this.cloudagent.proposeCredential(agentConnectionId, {
      schemaName: 'COMPANY_DETAILS',
      schemaVersion: '1.0.0',
      attributes: [
        {
          name: 'company_name',
          value: profile.company_name,
        },
        {
          name: 'company_number',
          value: profile.company_number,
        },
        {
          name: 'pin',
          value: pin,
        },
      ],
    })
  }
  private async pollPinSubmission(connectionId: string, initialPinAttemptsRemaining: number | null) {
    this.logger.trace('pollPinSubmission(): called %j', { connectionId, initialPinAttemptsRemaining })

    try {
      const finalState = checkDb(
        await this.db.waitForCondition(
          'connection',
          (rows) => !!checkDb(rows, initialPinAttemptsRemaining, this.logger),
          { id: connectionId }
        ),
        initialPinAttemptsRemaining,
        this.logger
      )
      if (finalState === undefined) {
        throw new InternalError(`finalState is ${finalState}`)
      }
      return finalState
    } catch (err) {
      this.logger.warn('unknown error occured %s', err?.toString())

      if (err instanceof DatabaseTimeoutError) {
        return {
          localPinAttempts: initialPinAttemptsRemaining,
          message: `Polling the database timed out after 5s. Please contact your invitation provider to resend the pin.`,
          nextScreen: 'error' as const,
        }
      }
      this.logger.info(`There has been an unexpected error waiting for pin response.`)
      throw new InternalError(err?.toString())
    }
  }
}
