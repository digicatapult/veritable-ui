import argon2 from 'argon2'
import express from 'express'
import { randomInt } from 'node:crypto'
import { pino } from 'pino'
import { Body, Get, Post, Produces, Query, Request, Route, Security, SuccessResponse } from 'tsoa'
import { injectable } from 'tsyringe'
import { z } from 'zod'

import { Env } from '../../env/index.js'
import Database from '../../models/db/index.js'
import EmailService from '../../models/emailService/index.js'
import CompanyHouseEntity, { OrganisationProfile } from '../../models/organisationRegistry.js'
import {
  base64UrlRegex,
  organisationNumberRegex,
  type BASE_64_URL,
  type COMPANY_NUMBER,
  type EMAIL,
} from '../../models/strings.js'
import VeritableCloudagent from '../../models/veritableCloudagent/index.js'
import { neverFail } from '../../utils/promises.js'
import { FromInviteTemplates } from '../../views/newConnection/fromInvite.js'
import { NewInviteFormStage, NewInviteTemplates } from '../../views/newConnection/newInvite.js'
import { PinSubmissionTemplates } from '../../views/newConnection/pinSubmission.js'
import { HTML, HTMLController } from '../HTMLController.js'

const submitToFormStage = {
  back: 'form',
  continue: 'confirmation',
  submit: 'success',
} as const

const inviteParser = z.object({
  companyNumber: z.string(),
  inviteUrl: z.string(),
})
type Invite = z.infer<typeof inviteParser>

@injectable()
@Security('oauth2')
@Route('/connection/new')
@Produces('text/html')
export class NewConnectionController extends HTMLController {
  constructor(
    private db: Database,
    private companyHouseEntity: CompanyHouseEntity,
    private cloudagent: VeritableCloudagent,
    private email: EmailService,
    private newInvite: NewInviteTemplates,
    private fromInvite: FromInviteTemplates,
    private pinSubmission: PinSubmissionTemplates,
    private env: Env
  ) {
    super()
  }

  /**
   *
   * @returns The new connections form page
   */
  @SuccessResponse(200)
  @Get('/')
  public async newConnectionForm(@Request() req: express.Request, @Query() fromInvite: boolean = false): Promise<HTML> {
    if (fromInvite) {
      req.log.trace('rendering new connection receiver form')
      return this.html(
        this.fromInvite.fromInviteFormPage({
          type: 'message',
          message: 'Please paste the invite text from the invitation email',
        })
      )
    }

    req.log.trace('rendering new connection requester form')
    return this.html(
      this.newInvite.newInviteFormPage({
        type: 'message',
        message: 'Please type in a valid company number to populate information',
      })
    )
  }

  /**
   * @returns a company from a validated company number
   */
  @SuccessResponse(200)
  @Get('/verify-company')
  public async verifyCompanyForm(
    @Request() req: express.Request,
    @Query() companyNumber: COMPANY_NUMBER | string
  ): Promise<HTML> {
    req.log.debug('verifying %s company number', companyNumber)

    if (!companyNumber.match(organisationNumberRegex)) {
      req.log.info('company %s number did not match %s regex', companyNumber, organisationNumberRegex)
      return this.newConnectionForm(req)
    }

    const companyOrError = await this.lookupCompany(req.log, companyNumber)
    if (companyOrError.type === 'error') {
      req.log.warn('Error occured while looking up the company %j', { companyNumber, err: companyOrError })
      return this.newInviteErrorHtml(companyOrError.message, undefined, companyNumber)
    }
    req.log.debug('comapny found, rendering next stage %j', companyOrError)

    return this.html(
      this.newInvite.newInviteForm({
        feedback: {
          type: 'companyFound',
          company: companyOrError.company,
        },
        formStage: 'form',
        companyNumber,
      })
    )
  }

  /**
   * @returns a invite from a validated connection invitation
   */
  @SuccessResponse(200)
  @Get('/verify-invite')
  public async verifyInviteForm(@Request() req: express.Request, @Query() invite: BASE_64_URL | string): Promise<HTML> {
    if (invite === '') {
      return this.newConnectionForm(req, true)
    }
    req.log.debug('new invite [%s] received', invite)

    if (!invite.match(base64UrlRegex)) {
      req.log.info('submitted invitation is not in base64 %s', invite)
      return this.receiveInviteErrorHtml('Invitation is not valid')
    }

    const inviteOrError = await this.decodeInvite(req.log, invite)
    if (inviteOrError.type === 'error') {
      req.log.info('unable to decode this invitation %j', inviteOrError)
      return this.receiveInviteErrorHtml(inviteOrError.message)
    }

    req.log.debug('invite successfully decoded %s', inviteOrError)

    return this.html(
      this.fromInvite.fromInviteForm({
        feedback: {
          type: 'companyFound',
          company: inviteOrError.company,
        },
      })
    )
  }

  /**
   * submits the company number for
   */
  @SuccessResponse(200)
  @Post('/create-invitation')
  public async submitNewInvite(
    @Request() req: express.Request,
    @Body()
    body: {
      companyNumber: COMPANY_NUMBER
      email: EMAIL
      action: 'back' | 'continue' | 'submit'
    }
  ): Promise<HTML> {
    // lookup company by number
    const companyOrError = await this.lookupCompany(req.log, body.companyNumber)
    if (companyOrError.type === 'error') {
      req.log.warn('unable to retrieve company details %j', body)
      return this.newInviteErrorHtml(companyOrError.message, body.email, body.companyNumber)
    }
    const company = companyOrError.company

    // if we're not at the final submission return next stage
    const formStage: NewInviteFormStage = submitToFormStage[body.action]
    if (formStage !== 'success') {
      req.log.info('rendering a final stage [%s] of new connection', formStage)
      return this.newInviteSuccessHtml(formStage, company, body.email)
    }

    req.log.info('new connection details %s (%s)', company.company_name, company.company_number)

    // otherwise we're doing final submit. Generate pin and oob invitation
    const pin = randomInt(1e6).toString(10).padStart(6, '0')
    const [pinHash, invite] = await Promise.all([
      argon2.hash(pin, { secret: this.env.get('INVITATION_PIN_SECRET') }),
      this.cloudagent.createOutOfBandInvite({ companyName: company.company_name }),
    ])

    req.log.info('invite created, inserting new connection %j', { company, pinHash, invite })
    // insert the connection
    const dbResult = await this.insertNewConnection(company, pinHash, invite.outOfBandRecord.id, null)
    if (dbResult.type === 'error') {
      req.log.warn('unable to insert a new connection %j', dbResult)
      return this.newInviteErrorHtml(dbResult.error, body.email, company.company_number)
    }

    const wrappedInvitation: Invite = {
      companyNumber: this.env.get('INVITATION_FROM_COMPANY_NUMBER'),
      inviteUrl: invite.invitationUrl,
    }

    req.log.info('sending connection_invite email to %s (%s) %j', body.email, company.company_name, wrappedInvitation)
    await this.sendNewConnectionEmail(body.email, company.company_name, wrappedInvitation)
    req.log.info('sending connection_invite_admin email %j', { company, pin })
    await this.sendAdminEmail(company, pin)

    // return the success response
    req.log.info('new connection, is complete: %s', dbResult.connectionId)
    return this.newInviteSuccessHtml(formStage, company, body.email)
  }

  /**
   * submits the company number for
   */
  @SuccessResponse(200)
  @Post('/receive-invitation')
  public async submitFromInvite(
    @Request() req: express.Request,
    @Body()
    body: {
      invite: BASE_64_URL | string
      action: 'createConnection'
    }
  ): Promise<HTML> {
    if (body.invite && !body.invite.match(base64UrlRegex)) {
      req.log.warn('invitation is not valid %j', body)
      return this.receiveInviteErrorHtml('Invitation is not valid')
    }

    req.log.info('decoding invite %s', body.invite)
    const inviteOrError = await this.decodeInvite(req.log, body.invite || '')
    if (inviteOrError.type === 'error') {
      req.log.warn('unable to decode invitation %j', inviteOrError)
      return this.receiveInviteErrorHtml(inviteOrError.message)
    }

    req.log.info(
      'new connection: details %s (%s)',
      inviteOrError.company.company_name,
      inviteOrError.company.company_number
    )

    // otherwise we're doing final submit. Generate pin and oob invitation
    const pin = randomInt(1e6).toString(10).padStart(6, '0')
    const [pinHash, invite] = await Promise.all([
      argon2.hash(pin, { secret: this.env.get('INVITATION_PIN_SECRET') }),
      this.cloudagent.receiveOutOfBandInvite({
        companyName: inviteOrError.company.company_name,
        invitationUrl: inviteOrError.inviteUrl,
      }),
    ])

    req.log.info('invite created, inserting new connection %j', { pinHash, invite })
    const dbResult = await this.insertNewConnection(
      inviteOrError.company,
      pinHash,
      invite.outOfBandRecord.id,
      invite.connectionRecord.id
    )
    if (dbResult.type === 'error') {
      req.log.warn('unable to insert a new connection %j', dbResult)
      return this.receiveInviteErrorHtml(dbResult.error)
    }

    await this.sendAdminEmail(inviteOrError.company, pin)

    req.log.info('new connection: complete: %s', dbResult.connectionId)
    this.setHeader('HX-Replace-Url', `/connection/${dbResult.connectionId}/pin-submission`)
    return this.receivePinSubmissionHtml(dbResult.connectionId)
  }

  private async decodeInvite(
    logger: pino.Logger,
    invite: BASE_64_URL
  ): Promise<
    { type: 'success'; inviteUrl: string; company: OrganisationProfile } | { type: 'error'; message: string }
  > {
    let wrappedInvite: Invite
    try {
      wrappedInvite = inviteParser.parse(JSON.parse(Buffer.from(invite, 'base64url').toString('utf8')))
    } catch (err) {
      logger.info('unknown error occured %j', err)
      return {
        type: 'error',
        message: 'Invitation is not valid',
      }
    }

    if (!wrappedInvite.companyNumber.match(organisationNumberRegex)) {
      logger.info('company number did not match a %s regex', organisationNumberRegex)
      return { type: 'error', message: 'Invitation is not valid' }
    }

    const companyOrError = await this.lookupCompany(logger, wrappedInvite.companyNumber)
    if (companyOrError.type === 'error') {
      return companyOrError
    }
    return { type: 'success', inviteUrl: wrappedInvite.inviteUrl, company: companyOrError.company }
  }

  private async lookupCompany(
    logger: pino.Logger,
    companyNumber: COMPANY_NUMBER
  ): Promise<{ type: 'success'; company: OrganisationProfile } | { type: 'error'; message: string }> {
    const companySearch = await this.companyHouseEntity.getCompanyProfileByCompanyNumber(companyNumber)
    if (companySearch.type === 'notFound') {
      logger.info('%s company not found', companySearch)
      return {
        type: 'error',
        message: 'Company number does not exist',
      }
    }
    const company = companySearch.company
    logger.info('company by %s number was found %j', companyNumber, company)

    const existingConnections = await this.db.get('connection', { company_number: companyNumber })
    if (existingConnections.length !== 0) {
      logger.info('connection already exists %j', existingConnections)
      return {
        type: 'error',
        message: `Connection already exists with ${company.company_name}`,
      }
    }

    if (company.registered_office_is_in_dispute) {
      logger.info("company's is in dispute %o", company)
      return {
        type: 'error',
        message: `Cannot validate company ${company.company_name} as address is currently in dispute`,
      }
    }

    if (company.company_status !== 'active') {
      logger.info('company is not active %j', company)
      return {
        type: 'error',
        message: `Company ${company.company_name} is not active`,
      }
    }

    return {
      type: 'success',
      company,
    }
  }

  private async insertNewConnection(
    company: OrganisationProfile,
    pinHash: string,
    invitationId: string,
    agentConnectionId: string | null
  ): Promise<{ type: 'success'; connectionId: string } | { type: 'error'; error: string }> {
    try {
      let connectionId: string = ''
      await this.db.withTransaction(async (db) => {
        const [record] = await db.insert('connection', {
          company_name: company.company_name,
          company_number: company.company_number,
          agent_connection_id: agentConnectionId,
          status: 'pending',
          pin_attempt_count: 0,
          pin_tries_remaining_count: null,
        })

        await db.insert('connection_invite', {
          connection_id: record.id,
          oob_invite_id: invitationId,
          pin_hash: pinHash,
          expires_at: new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000),
          validity: 'valid',
        })
        connectionId = record.id
      })

      return { type: 'success', connectionId }
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.endsWith('duplicate key value violates unique constraint "unq_connection_company_number"')
      ) {
        return {
          type: 'error',
          error: `Connection already exists with ${company.company_name}`,
        }
      }
      throw err
    }
  }

  private async sendNewConnectionEmail(
    email: string,
    toCompanyName: string,
    invite: { companyNumber: string; inviteUrl: string }
  ) {
    const fromCompany = await this.companyHouseEntity.localCompanyHouseProfile()
    const inviteBase64 = Buffer.from(JSON.stringify(invite), 'utf8').toString('base64url')

    await neverFail(
      this.email.sendMail('connection_invite', {
        to: email,
        invite: inviteBase64,
        toCompanyName,
        fromCompanyName: fromCompany.company_name,
      })
    )
  }

  private async sendAdminEmail(company: OrganisationProfile, pin: string) {
    await neverFail(
      this.email.sendMail('connection_invite_admin', {
        receiver: company.company_name,
        address: [
          company.company_name,
          company.registered_office_address.address_line_1,
          company.registered_office_address.address_line_2,
          company.registered_office_address.care_of,
          company.registered_office_address.locality,
          company.registered_office_address.po_box,
          company.registered_office_address.postal_code,
          company.registered_office_address.country,
          company.registered_office_address.premises,
          company.registered_office_address.region,
        ]
          .filter((x) => !!x)
          .join(', '),
        pin,
      })
    )
  }

  private newInviteSuccessHtml(formStage: NewInviteFormStage, company: OrganisationProfile, email: string) {
    return this.html(
      this.newInvite.newInviteForm({
        feedback: {
          type: 'companyFound',
          company,
        },
        formStage: formStage,
        email: email,
        companyNumber: company.company_number,
      })
    )
  }

  private newInviteErrorHtml(error: string, email?: string, companyNumber?: string) {
    return this.html(
      this.newInvite.newInviteForm({
        feedback: {
          type: 'error',
          error,
        },
        formStage: 'form',
        email,
        companyNumber,
      })
    )
  }

  private receivePinSubmissionHtml(connectionId: string) {
    return this.html(
      this.pinSubmission.renderPinForm({
        connectionId,
        continuationFromInvite: true,
      })
    )
  }

  private receiveInviteErrorHtml(message: string) {
    return this.html(
      this.fromInvite.fromInviteForm({
        feedback: {
          type: 'error',
          error: message,
        },
      })
    )
  }
}
