import { randomInt } from 'node:crypto'

import argon2 from 'argon2'
import { Body, Get, Post, Produces, Query, Route, Security, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'
import { z } from 'zod'

import { Env } from '../../env.js'
import { Logger, type ILogger } from '../../logger.js'
import CompanyHouseEntity, { CompanyProfile } from '../../models/companyHouseEntity.js'
import Database from '../../models/db/index.js'
import EmailService from '../../models/emailService/index.js'
import {
  BASE_64_URL,
  PIN_CODE,
  base64UrlRegex,
  companyNumberRegex,
  type COMPANY_NUMBER,
  type EMAIL,
} from '../../models/strings.js'
import VeritableCloudagent from '../../models/veritableCloudagent.js'
import { FromInviteTemplates } from '../../views/newConnection/fromInvite.js'
import { NewInviteFormStage, NewInviteTemplates } from '../../views/newConnection/newInvite.js'
import { HTML, HTMLController } from '../HTMLController.js'

const submitToFormStage = {
  back: 'form',
  continue: 'confirmation',
  pin: 'pin',
  submit: 'success',
} as const

const inviteParser = z.object({
  companyNumber: z.string(),
  inviteUrl: z.string(),
})
type Invite = z.infer<typeof inviteParser>

@singleton()
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
    private env: Env,
    @inject(Logger) private logger: ILogger
  ) {
    super()
    this.logger = logger.child({ controller: '/connection/new' })
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
   * @returns a company from a validated company number
   */
  @SuccessResponse(200)
  @Get('/verify-company')
  public async verifyCompanyForm(@Query() companyNumber: COMPANY_NUMBER | string): Promise<HTML> {
    if (!companyNumber.match(companyNumberRegex)) {
      return this.newConnectionForm()
    }

    const companyOrError = await this.lookupCompany(companyNumber)
    if (companyOrError.type === 'error') {
      return this.newInviteErrorHtml(companyOrError.message, undefined, companyNumber)
    }
    const company = companyOrError.company

    return this.html(
      this.newInvite.newInviteForm({
        feedback: {
          type: 'companyFound',
          company: company,
        },
        formStage: 'form',
        companyNumber,
      })
    )
  }

  /**
   * @returns a company from a validated connection invitation
   */
  @SuccessResponse(200)
  @Get('/verify-invite')
  public async verifyInviteForm(@Query() invite: BASE_64_URL | string): Promise<HTML> {
    if (invite === '') {
      return this.newConnectionForm(true)
    }

    if (!invite.match(base64UrlRegex)) {
      return this.receiveInviteErrorHtml('Invitation is not valid')
    }

    const inviteOrError = await this.decodeInvite(invite)

    if (inviteOrError.type === 'error') {
      return this.receiveInviteErrorHtml(inviteOrError.message)
    }
    const company = inviteOrError.company

    return this.html(
      this.fromInvite.fromInviteForm({
        feedback: {
          type: 'companyFound',
          company: company,
        },
        formStage: 'success',
      })
    )
  }

  /**
   * physical validation, currently the plan is that @pin
   * is generated as part invitation response to the requester (Bob)
   * and sent along invitation
   */
  @SuccessResponse(200)
  @Get('/verify-pin')
  public async verifyPin(@Query() pin: string, @Query() companyName: string): Promise<HTML> {
    const [pinHash] = await Promise.all([
      argon2.hash(pin, { secret: Buffer.from(this.env.get('INVITATION_PIN_SECRET'), 'utf8') }),
      this.cloudagent.createOutOfBandInvite({ companyName }),
    ])

    this.logger.debug(`pin hash - ${pinHash}`)
    const connectionInvite = await this.db.get('connection_invite', { pin_hash: pinHash }).then((res) => res[0])

    if (!connectionInvite?.pin_hash || connectionInvite.pin_hash !== pinHash) {
      return this.html(
        this.fromInvite.newInvitePin({
          pin,
          feedback: {
            type: 'error',
            error: `Database pin validation has failed. ${pinHash},`,
          },
        })
      )
    }

    this.logger.debug('%o', connectionInvite)

    return this.html(
      this.fromInvite.newInvitePin({
        pin,
        feedback: {
          pin,
          type: 'pinFound',
        },
      })
    )
  }

  /**
   * submits the pin code for validation
   */
  @SuccessResponse(200)
  @Post('/pin-validation')
  public async submitPin(
    @Body()
    body: {
      invite: BASE_64_URL | string
      pin: PIN_CODE
    }
  ): Promise<HTML> {
    const decodedInvite = await this.decodeInvite(body.invite)
    if (decodedInvite.type === 'error') {
      return this.receiveInviteErrorHtml(decodedInvite.message)
    }
    return this.newInviteSuccessHtml('success', {} as CompanyProfile, body.pin)
  }

  /**
   * submits the company number for
   */
  @SuccessResponse(200)
  @Post('/create-invitation')
  public async submitNewInvite(
    @Body()
    body: {
      companyNumber: COMPANY_NUMBER
      email: EMAIL
      action: 'back' | 'continue' | 'submit'
    }
  ): Promise<HTML> {
    // lookup company by number
    const companyOrError = await this.lookupCompany(body.companyNumber)
    if (companyOrError.type === 'error') {
      return this.newInviteErrorHtml(companyOrError.message, body.email, body.companyNumber)
    }
    const company = companyOrError.company

    // if we're not at the final submission return next stage
    const formStage: NewInviteFormStage = submitToFormStage[body.action]
    if (formStage !== 'success' /* &&  formStage === 'pin' */) {
      return this.newInviteSuccessHtml(formStage, company, body.email)
    }

    this.logger.debug('NEW_CONNECTION: details %s (%s)', company.company_name, company.company_number)

    // otherwise we're doing final submit. Generate pin and oob invitation
    const pin = randomInt(1e6).toString(10).padStart(6, '0')
    const [pinHash, invite] = await Promise.all([
      argon2.hash(pin, { secret: Buffer.from(this.env.get('INVITATION_PIN_SECRET'), 'utf8') }),
      this.cloudagent.createOutOfBandInvite({ companyName: company.company_name }),
    ])

    // insert the connection
    const dbResult = await this.insertNewConnection(company, pinHash, invite.outOfBandRecord.id, null)
    if (dbResult.type === 'error') {
      return this.newInviteErrorHtml(dbResult.error, body.email, company.company_number)
    }

    const wrappedInvitation: Invite = {
      companyNumber: this.env.get('INVITATION_FROM_COMPANY_NUMBER'),
      inviteUrl: invite.invitationUrl,
    }

    // send emails
    await this.sendNewConnectionEmail(body.email, wrappedInvitation)
    await this.sendAdminEmail(company, pin)

    // return the success response
    this.logger.debug('NEW_CONNECTION: complete: %s', dbResult.connectionId)
    return this.newInviteSuccessHtml(formStage, company, body.email)
  }

  /**
   * submits the company number for
   */
  @SuccessResponse(200)
  @Post('/receive-invitation')
  public async submitFromInvite(
    @Body()
    body: {
      invite: BASE_64_URL
      action: 'createConnection'
    }
  ): Promise<HTML> {
    if (!body.invite.match(base64UrlRegex)) {
      return this.receiveInviteErrorHtml('Invitation is not valid')
    }

    const inviteOrError = await this.decodeInvite(body.invite)
    if (inviteOrError.type === 'error') {
      return this.receiveInviteErrorHtml(inviteOrError.message)
    }

    this.logger.debug(
      'NEW_CONNECTION: details %s (%s)',
      inviteOrError.company.company_name,
      inviteOrError.company.company_number
    )

    // otherwise we're doing final submit. Generate pin and oob invitation
    const pin = randomInt(1e6).toString(10).padStart(6, '0')
    const [pinHash, invite] = await Promise.all([
      argon2.hash(pin, { secret: Buffer.from(this.env.get('INVITATION_PIN_SECRET'), 'utf8') }),
      this.cloudagent.receiveOutOfBandInvite({
        companyName: inviteOrError.company.company_name,
        invitationUrl: inviteOrError.inviteUrl,
      }),
    ])

    const dbResult = await this.insertNewConnection(
      inviteOrError.company,
      pinHash,
      invite.outOfBandRecord.id,
      invite.connectionRecord.id
    )
    if (dbResult.type === 'error') {
      return this.receiveInviteErrorHtml(dbResult.error)
    }

    await this.sendAdminEmail(inviteOrError.company, pin)

    this.logger.debug('NEW_CONNECTION: complete: %s', dbResult.connectionId)
    return this.receiveInviteSuccessHtml(inviteOrError.company)
  }

  private async decodeInvite(
    invite: string
  ): Promise<{ type: 'success'; inviteUrl: string; company: CompanyProfile } | { type: 'error'; message: string }> {
    let wrappedInvite: Invite
    try {
      wrappedInvite = inviteParser.parse(JSON.parse(Buffer.from(invite, 'base64url').toString('utf8')))
    } catch (_) {
      return {
        type: 'error',
        message: 'Invitation is not valid',
      }
    }

    if (!wrappedInvite.companyNumber.match(companyNumberRegex)) {
      return { type: 'error', message: 'Invitation is not valid' }
    }

    const companyOrError = await this.lookupCompany(wrappedInvite.companyNumber)
    if (companyOrError.type === 'error') {
      return companyOrError
    }
    return { type: 'success', inviteUrl: wrappedInvite.inviteUrl, company: companyOrError.company }
  }

  private async lookupCompany(
    companyNumber: COMPANY_NUMBER
  ): Promise<{ type: 'success'; company: CompanyProfile } | { type: 'error'; message: string }> {
    this.logger.debug('COMPANY_LOOKUP: %s', companyNumber)

    const companySearch = await this.companyHouseEntity.getCompanyProfileByCompanyNumber(companyNumber)
    if (companySearch.type === 'notFound') {
      return {
        type: 'error',
        message: 'Company number does not exist',
      }
    }
    const company = companySearch.company

    const existingConnections = await this.db.get('connection', { company_number: companyNumber })
    if (existingConnections.length !== 0) {
      return {
        type: 'error',
        message: `Connection already exists with ${company.company_name}`,
      }
    }

    if (company.registered_office_is_in_dispute) {
      return {
        type: 'error',
        message: `Cannot validate company ${company.company_name} as address is currently in dispute`,
      }
    }

    if (company.company_status !== 'active') {
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
    company: CompanyProfile,
    pinHash: string,
    invitationId: string,
    agentConnectionId: string | null
  ): Promise<{ type: 'success'; connectionId: string } | { type: 'error'; error: string }> {
    this.logger.debug('NEW_CONNECTION: invite id %s', invitationId)

    try {
      let connectionId: string = ''
      await this.db.withTransaction(async (db) => {
        const [record] = await db.insert('connection', {
          company_name: company.company_name,
          company_number: company.company_number,
          agent_connection_id: agentConnectionId,
          status: 'pending',
        })

        await db.insert('connection_invite', {
          connection_id: record.id,
          oob_invite_id: invitationId,
          pin_hash: pinHash,
          expires_at: new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000),
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

  private async sendNewConnectionEmail(email: string, invite: { companyNumber: string; inviteUrl: string }) {
    this.logger.debug('NEW_CONNECTION: sending emails')
    const inviteBase64 = Buffer.from(JSON.stringify(invite), 'utf8').toString('base64url')

    try {
      await this.email.sendMail('connection_invite', {
        to: email,
        invite: inviteBase64,
      })
    } catch (_) {}
  }

  private async sendAdminEmail(company: CompanyProfile, pin: string) {
    this.logger.debug('NEW_CONNECTION: sending emails')

    try {
      await this.email.sendMail('connection_invite_admin', {
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
          .join('\r\n'),
        pin,
      })
    } catch (_) {}
  }

  private newInviteSuccessHtml(formStage: NewInviteFormStage, company: CompanyProfile, email: string) {
    return this.html(
      this.newInvite.newInviteForm({
        feedback: {
          type: 'companyFound',
          company: company,
        },
        formStage: formStage,
        email: email,
        companyNumber: company.company_number,
      })
    )
  }

  private newInviteErrorHtml(message: string, email?: string, companyNumber?: string) {
    return this.html(
      this.newInvite.newInviteForm({
        feedback: {
          type: 'error',
          error: message,
        },
        formStage: 'form',
        email: email,
        companyNumber: companyNumber,
      })
    )
  }

  private receiveInviteSuccessHtml(company: CompanyProfile) {
    return this.html(
      this.fromInvite.fromInviteForm({
        feedback: {
          type: 'companyFound',
          company: company,
        },
        formStage: 'success',
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
        formStage: 'invite',
      })
    )
  }
}
