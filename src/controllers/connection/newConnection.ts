import { randomInt } from 'node:crypto'

import argon2 from 'argon2'
import { Body, Get, Post, Produces, Query, Route, Security, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { Env } from '../../env.js'
import { Logger, type ILogger } from '../../logger.js'
import CompanyHouseEntity from '../../models/companyHouseEntity.js'
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
    this.logger.debug('new connection page requested')
    return this.html(
      this.newConnection.formPage(
        {
          status: 'error',
          errorMessage: await this.newConnection.companyEmptyTextBox({
            errorMessage: 'Please type in company number to populate information',
          }),
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
    try {
      const company = await this.companyHouseEntity.getCompanyProfileByCompanyNumber(companyNumber)
      return this.html(
        this.newConnection.companyFormInput({
          targetBox: {
            status: 'success',
            company: company,
          },
          formStage: 'form',
        })
      )
    } catch (err) {
      return this.html(
        this.newConnection.companyFormInput({
          targetBox: {
            status: 'error',
            errorMessage: 'Company number does not exist',
          },
          formStage: 'form',
        })
      )
    }
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
    const formStage: FormStage = submitToFormStage[body.submitButton]

    const company = await this.companyHouseEntity.getCompanyProfileByCompanyNumber(body.companyNumber).catch(() => null)
    if (!company) {
      return this.html(
        this.newConnection.companyFormInput({
          targetBox: {
            status: 'error',
            errorMessage: 'Company number does not exist',
          },
          formStage: 'form',
        })
      )
    }

    const successHtml = this.html(
      this.newConnection.companyFormInput({
        targetBox: {
          status: 'success',
          company: company,
        },
        formStage: formStage,
        email: body.email,
        companyNumber: body.companyNumber,
      })
    )
    if (formStage !== 'success') {
      return successHtml
    }

    if (company.registered_office_is_in_dispute) {
      return this.html(
        this.newConnection.companyFormInput({
          targetBox: {
            status: 'error',
            errorMessage: `Cannot validate company ${company.company_name} as address is currently in dispute`,
          },
          formStage: 'form',
        })
      )
    }

    const pin = randomInt(1e6).toString(10).padStart(6, '0')
    const [pinHash, invite] = await Promise.all([
      argon2.hash(pin, { secret: this.env.get('INVITATION_PIN_SECRET') }),
      await this.cloudagent.createOutOfBandInvite({ companyName: company.company_name }),
    ])

    await this.db.withTransaction(async (db) => {
      const [record] = await db.upsert('connection', {
        company_name: company.company_name,
        company_number: body.companyNumber,
        status: 'pending',
      })

      await db.insert('connection_invite', {
        connection_id: record.id,
        oob_invite_id: invite.invitation.id,
        pin_hash: pinHash,
        expires_at: new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000),
      })
    })

    try {
      await this.email.sendMail('connection_invite', { to: body.email, invite: invite.invitationUrl })
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
    } finally {
      return successHtml
    }
  }
}
