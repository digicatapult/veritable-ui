import { randomInt } from 'node:crypto'

import argon2 from 'argon2'
import { Get, Produces, Query, Route, Security, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { Env } from '../../env.js'
import { Logger, type ILogger } from '../../logger.js'
import CompanyHouseEntity from '../../models/companyHouseEntity.js'
import Database from '../../models/db/index.js'
import EmailService from '../../models/emailService/index.js'
import VeritableCloudagent from '../../models/veritableCloudagent.js'
import NewConnectionTemplates from '../../views/newConnection.js'
import { HTML, HTMLController } from '../HTMLController.js'

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
      this.newConnection.formPage({
        targetBox: await this.newConnection.companyEmptyTextBox({
          errorMessage: 'Please type in company number to populate information',
        }),
      })
    )
  }

  /**
   * Returns a company from a validated company number
   */
  @SuccessResponse(200)
  @Get('/verify-company')
  public async verifyCompanyForm(@Query() companyNumber: string): Promise<HTML> {
    this.logger.debug('connections page requested')
    const regex =
      /^(((AC|CE|CS|FC|FE|GE|GS|IC|LP|NC|NF|NI|NL|NO|NP|OC|OE|PC|R0|RC|SA|SC|SE|SF|SG|SI|SL|SO|SR|SZ|ZC|\d{2})\d{6})|((IP|SP|RS)[A-Z\d]{6})|(SL\d{5}[\dA]))$/
    if (!regex.test(`${companyNumber}`)) {
      return this.html(
        this.newConnection.companyNumberInput({
          targetBox: await this.newConnection.companyEmptyTextBox({ errorMessage: 'Company number format incorrect' }),
        })
      )
    }
    let company
    try {
      company = await this.companyHouseEntity.getCompanyProfileByCompanyNumber(companyNumber)
    } catch (err) {
      return this.html(
        this.newConnection.companyNumberInput({
          targetBox: await this.newConnection.companyEmptyTextBox({ errorMessage: 'Company number does not exist' }),
        })
      )
    }

    return this.html(
      this.newConnection.companyNumberInput({
        targetBox: await this.newConnection.companyFilledTextBox({ company }),
      })
    )
  }

  /**
   * submits the company number for
   */
  @SuccessResponse(200)
  @Get('/submit')
  public async submitCompanyNumber(): Promise<HTML> {
    // do some regex if there is a match on the whole regex return true else return false
    return this.html(this.newConnection.companyEmptyTextBox({ errorMessage: 'Company does not exist' }))
  }

  public async processNewConnectionSubmit(params: {
    companyName: string
    companyAddress: string
    companyNumber: string
    contactEmail: string
  }): Promise<void> {
    const pin = randomInt(1e8).toString(10).padStart(8, '0')
    const [pinHash, invite] = await Promise.all([
      argon2.hash(pin, { secret: this.env.get('INVITATION_PIN_SECRET') }),
      await this.cloudagent.createOutOfBandInvite(params),
    ])

    await this.db.withTransaction(async (db) => {
      const [record] = await db.upsert('connection', {
        company_name: params.companyName,
        company_number: params.companyNumber,
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
      await this.email.sendMail('connection_invite', { to: params.contactEmail, invite: invite.invitationUrl })
      await this.email.sendMail('connection_invite_admin', {
        to: params.contactEmail,
        address: params.companyAddress,
        pin,
      })
    } finally {
      return
    }
  }
}
