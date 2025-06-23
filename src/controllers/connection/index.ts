import express from 'express'
import { pino } from 'pino'
import { Body, Get, Path, Post, Produces, Query, Request, Route, Security, SuccessResponse } from 'tsoa'
import { injectable } from 'tsyringe'

import { pinCodeRegex, type PIN_CODE, type UUID } from '../../models/strings.js'
import ConnectionTemplates from '../../views/connection/connection.js'

import { DatabaseTimeoutError, InternalError, InvalidInputError, NotFoundError } from '../../errors.js'
import { ILogger } from '../../logger.js'
import Database from '../../models/db/index.js'
import { ConnectionRow } from '../../models/db/types.js'
import OrganisationRegistryEntity, { OrganisationProfile } from '../../models/organisationRegistry.js'
import VeritableCloudagent from '../../models/veritableCloudagent/index.js'
import { PinSubmissionTemplates } from '../../views/newConnection/pinSubmission.js'
import { HTML, HTMLController } from '../HTMLController.js'
import { checkDb } from './helpers.js'

@injectable()
@Security('oauth2')
@Route('/connection')
@Produces('text/html')
export class ConnectionController extends HTMLController {
  constructor(
    private db: Database,
    private cloudagent: VeritableCloudagent,
    private organisationRegistryEntity: OrganisationRegistryEntity,
    private connectionTemplates: ConnectionTemplates,
    private pinSubmission: PinSubmissionTemplates
  ) {
    super()
  }

  /**
   * Retrieves the connection list page
   */
  @SuccessResponse(200)
  @Get('/')
  public async listConnections(@Request() req: express.Request, @Query() search: string = ''): Promise<HTML> {
    const connections =
      search !== ''
        ? await this.db.get('connection', [['company_name', 'ILIKE', `%${search}%`]], [['updated_at', 'desc']])
        : await this.db.get('connection', {}, [['updated_at', 'desc']])

    req.log.debug('returning connections page %j', { connections, search })
    this.setHeader('HX-Replace-Url', search ? `/connection?search=${encodeURIComponent(search)}` : `/connection`)
    return this.html(this.connectionTemplates.listPage(connections, search))
  }

  /**
   * render pin code submission form
   * @param companyNumber - for retrieving a connection from a db
   * @param pin - a pin code
   * @returns HTML Html of the updated render pin form
   */
  @SuccessResponse(200)
  @Get('/{connectionId}/pin-submission')
  public async renderPinCode(
    @Request() req: express.Request,
    @Path() connectionId: UUID,
    @Query() pin?: PIN_CODE | string
  ): Promise<HTML> {
    req.log.debug('pin submission form', { connectionId, pin })

    const [connection]: ConnectionRow[] = await this.db.get('connection', { id: connectionId })
    if (!connection) {
      throw new NotFoundError(`[connection]: ${connectionId}`)
    }

    req.log.info('rendering pin code form for connection %j', { connection })

    return this.html(this.pinSubmission.renderPinForm({ connectionId, pin: pin ?? '', continuationFromInvite: false }))
  }

  /**
   * handles PIN code submission form submit action
   * @param body - contains forms inputs
   * @returns HTML Html of the pin submission form or an error
   */
  @SuccessResponse(200)
  @Post('/{connectionId}/pin-submission')
  public async submitPinCode(
    @Request() req: express.Request,
    @Body() body: { action: 'submitPinCode'; pin: PIN_CODE | string; stepCount?: number },
    @Path() connectionId: UUID
  ): Promise<HTML> {
    req.log.debug('pin submission POST request body %o', { body })
    const { pin } = body

    if (!pin.match(pinCodeRegex)) {
      req.log.info('pin %s did not match a %s regex', pin, pinCodeRegex)
      return this.html(this.pinSubmission.renderPinForm({ connectionId, pin, continuationFromInvite: false }))
    }

    const profile = await this.organisationRegistryEntity.localOrganisationProfile()
    const [connection]: ConnectionRow[] = await this.db.get('connection', { id: connectionId })

    if (!connection) throw new NotFoundError(`[connection]: ${connectionId}`)

    const agentConnectionId = connection.agent_connection_id
    if (!agentConnectionId) throw new InvalidInputError('Cannot verify PIN on a pending connection')
    //check initial db state of pin_tries_remaining_counts

    req.log.info('verifying a new connection', { agentConnectionId, profile, pin })
    await this.verifyReceiveConnection(req.log, agentConnectionId, profile, pin)

    // loading spinner for htmx
    const localPinAttemptCount = await this.pollPinSubmission(
      req.log.child({ called: 'this.pollPinSubmission' }),
      connectionId,
      connection.pin_tries_remaining_count
    )

    if (localPinAttemptCount.nextScreen === 'success') {
      req.log.debug('pin %s accepted and redering success page', pin)

      return this.html(
        this.pinSubmission.renderSuccess({ companyName: connection.company_name, stepCount: body.stepCount ?? 2 })
      )
    }
    if (localPinAttemptCount.nextScreen === 'error') {
      req.log.info('render error screen with message coming from poll Pin submission')

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

  private async verifyReceiveConnection(
    logger: pino.Logger,
    agentConnectionId: string,
    profile: OrganisationProfile,
    pin: string
  ) {
    logger.debug('verifyReceiveConnection(): called for credential proposal', { agentConnectionId, profile, pin })

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
  private async pollPinSubmission(logger: ILogger, connectionId: string, initialPinAttemptsRemaining: number | null) {
    logger.trace('pollPinSubmission(): called for database checks %j', { connectionId, initialPinAttemptsRemaining })

    try {
      const finalState = checkDb(
        await this.db.waitForCondition('connection', (rows) => !!checkDb(rows, initialPinAttemptsRemaining, logger), {
          id: connectionId,
        }),
        initialPinAttemptsRemaining,
        logger
      )
      if (finalState === undefined) {
        throw new InternalError(`finalState is ${finalState}`)
      }
      return finalState
    } catch (err) {
      logger.warn('unknown error occured %s', err?.toString())

      if (err instanceof DatabaseTimeoutError) {
        return {
          localPinAttempts: initialPinAttemptsRemaining,
          message: `Polling the database timed out after 5s. Please contact your invitation provider to resend the pin.`,
          nextScreen: 'error' as const,
        }
      }
      throw new InternalError(err?.toString())
    }
  }
}
