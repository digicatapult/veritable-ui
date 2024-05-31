import { randomInt } from 'node:crypto'

import argon2 from 'argon2'
import { Body, Get, Post, Produces, Query, Route, Security, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { Env } from '../../env.js'
import { Logger, type ILogger } from '../../logger.js'
import CompanyHouseEntity, { CompanyProfile } from '../../models/companyHouseEntity.js'
import Database from '../../models/db/index.js'
import EmailService from '../../models/emailService/index.js'
import type { COMPANY_NUMBER, EMAIL } from '../../models/strings.js'
import VeritableCloudagent from '../../models/veritableCloudagent.js'
import NewConnectionTemplates, { FormStage } from '../../views/newConnection.js'
import { HTML, HTMLController } from '../HTMLController.js'

const submitToFormStage = {
  Back: 'form',
  Continue: 'confirmation',
  Submit: 'success',
} as const

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
    private newConnection: NewConnectionTemplates,
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
  public async newConnectionForm(): Promise<HTML> {
    return this.html(
      this.newConnection.formPage(
        {
          status: 'error',
          errorMessage: 'Please type in company number to populate information',
        },
        'form'
      )
    )
  }

  /**
   * @returns a company from a validated company number
   */
  @SuccessResponse(200)
  @Get('/verify-company')
  public async verifyCompanyForm(@Query() companyNumber: COMPANY_NUMBER): Promise<HTML> {
    const companyOrError = await this.lookupCompany(companyNumber)
    if (companyOrError.type === 'error') {
      return companyOrError.response
    }
    const company = companyOrError.company

    return this.html(
      this.newConnection.companyFormInput({
        targetBox: {
          status: 'success',
          company: company,
        },
        formStage: 'form',
        companyNumber,
      })
    )
  }

  /**
   * submits the company number for
   */
  @SuccessResponse(200)
  @Post('/submit')
  public async submitCompanyNumber(
    @Body()
    body: {
      companyNumber: string
      email: EMAIL
      submitButton: 'Back' | 'Continue' | 'Submit'
    }
  ): Promise<HTML> {
    // lookup company by number
    const companyOrError = await this.lookupCompany(body.companyNumber, body.email)
    if (companyOrError.type === 'error') {
      return companyOrError.response
    }
    const company = companyOrError.company

    // if we're not at the final submission return next stage
    const formStage: FormStage = submitToFormStage[body.submitButton]
    if (formStage !== 'success') {
      return this.formSuccessHtml(formStage, company, body.email)
    }

    this.logger.debug('NEW_CONNECTION: details %s (%s)', company.company_name, company.company_number)

    // otherwise we're doing final submit. Generate pin and oob invitation
    const pin = randomInt(1e6).toString(10).padStart(6, '0')
    const [pinHash, invite] = await Promise.all([
      argon2.hash(pin, { secret: Buffer.from(this.env.get('INVITATION_PIN_SECRET'), 'utf8') }),
      this.cloudagent.createOutOfBandInvite({ companyName: company.company_name }),
    ])

    // insert the connection
    const dbResult = await this.insertNewConnection(company, body.email, pinHash, invite.invitation.id)
    if (dbResult.type === 'error') {
      return dbResult.response
    }

    // send emails
    await this.sendNewConnectionEmails(company, body.email, invite.invitationUrl, pin)

    // return the success response
    this.logger.debug('NEW_CONNECTION: complete', invite.invitation.id)
    return this.formSuccessHtml(formStage, company, body.email)
  }

  private async lookupCompany(
    companyNumber: string,
    email?: string
  ): Promise<{ type: 'success'; company: CompanyProfile } | { type: 'error'; response: Promise<HTML> }> {
    this.logger.debug('COMPANY_LOOKUP: %s', companyNumber)

    const companySearch = await this.companyHouseEntity.getCompanyProfileByCompanyNumber(companyNumber)
    if (companySearch.type === 'notFound') {
      return {
        type: 'error',
        response: this.formErrorHtml('Company number does not exist', email, companyNumber),
      }
    }
    const company = companySearch.company

    const existingConnections = await this.db.get('connection', { company_number: companyNumber })
    if (existingConnections.length !== 0) {
      return {
        type: 'error',
        response: this.formErrorHtml(`Connection already exists with ${company.company_name}`, email, companyNumber),
      }
    }

    if (company.registered_office_is_in_dispute) {
      return {
        type: 'error',
        response: this.formErrorHtml(
          `Cannot validate company ${company.company_name} as address is currently in dispute`,
          email,
          companyNumber
        ),
      }
    }

    if (company.company_status !== 'active') {
      return {
        type: 'error',
        response: this.formErrorHtml(`Company ${company.company_name} is not active`, email, companyNumber),
      }
    }

    return {
      type: 'success',
      company,
    }
  }

  private async insertNewConnection(
    company: CompanyProfile,
    email: string,
    pinHash: string,
    invitationId: string
  ): Promise<{ type: 'success' } | { type: 'error'; response: Promise<HTML> }> {
    this.logger.debug('NEW_CONNECTION: invite id %s', invitationId)

    try {
      await this.db.withTransaction(async (db) => {
        const [record] = await db.insert('connection', {
          company_name: company.company_name,
          company_number: company.company_number,
          status: 'pending',
        })

        await db.insert('connection_invite', {
          connection_id: record.id,
          oob_invite_id: invitationId,
          pin_hash: pinHash,
          expires_at: new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000),
        })
      })

      return { type: 'success' }
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.endsWith('duplicate key value violates unique constraint "unq_connection_company_number"')
      ) {
        return {
          type: 'error',
          response: this.formErrorHtml(
            `Connection already exists with ${company.company_name}`,
            email,
            company.company_number
          ),
        }
      }
      throw err
    }
  }

  private async sendNewConnectionEmails(company: CompanyProfile, email: string, inviteUrl: string, pin: string) {
    this.logger.debug('NEW_CONNECTION: sending emails')

    try {
      await this.email.sendMail('connection_invite', { to: email, invite: inviteUrl })
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

  private formSuccessHtml(formStage: FormStage, company: CompanyProfile, email: string) {
    return this.html(
      this.newConnection.companyFormInput({
        targetBox: {
          status: 'success',
          company: company,
        },
        formStage: formStage,
        email: email,
        companyNumber: company.company_number,
      })
    )
  }

  private formErrorHtml(message: string, email?: string, companyNumber?: string) {
    return this.html(
      this.newConnection.companyFormInput({
        targetBox: {
          status: 'error',
          errorMessage: message,
        },
        formStage: 'form',
        email: email,
        companyNumber: companyNumber,
      })
    )
  }
}
