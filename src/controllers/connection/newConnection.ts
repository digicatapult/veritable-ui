import { Body, Get, Post, Produces, Query, Route, Security, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { Logger, type ILogger } from '../../logger.js'
import CompantHouseEntity, { CompanyProfile, emailSchema } from '../../models/companyHouseEntity.js'
import NewConnectionTemplates, { FormStage } from '../../views/newConnection.js'
import { HTML, HTMLController } from '../HTMLController.js'

@singleton()
@injectable()
@Security('oauth2')
@Route('/connection/new')
@Produces('text/html')
export class NewConnectionController extends HTMLController {
  constructor(
    private companyHouseEntity: CompantHouseEntity,
    private newConnection: NewConnectionTemplates,
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
   * Returns a company from a validated company number
   */
  @SuccessResponse(200)
  @Get('/verify-company')
  public async verifyCompanyForm(@Query() companyNumber: string): Promise<HTML> {
    const regex =
      /^(((AC|CE|CS|FC|FE|GE|GS|IC|LP|NC|NF|NI|NL|NO|NP|OC|OE|PC|R0|RC|SA|SC|SE|SF|SG|SI|SL|SO|SR|SZ|ZC|\d{2})\d{6})|((IP|SP|RS)[A-Z\d]{6})|(SL\d{5}[\dA]))$/
    if (!regex.test(`${companyNumber}`)) {
      return this.html(
        this.newConnection.companyFormInput({
          targetBox: {
            status: 'error',
            errorMessage: 'Company number format incorrect',
          },
          formStage: 'form',
        })
      )
    }
    let company: CompanyProfile
    try {
      company = await this.companyHouseEntity.getCompanyProfileByCompanyNumber(companyNumber)
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

    return this.html(
      this.newConnection.companyFormInput({
        targetBox: {
          status: 'success',
          company: company,
        },
        formStage: 'form',
      })
    )
  }

  /**
   * submits the company number for
   */
  @SuccessResponse(200)
  @Post('/submit')
  public async submitCompanyNumber(
    @Body() body: { companyNumber: string; email: string; formStage: string; submitButton: string }
  ): Promise<HTML> {
    // do some regex if there is a match on the whole regex return true else return false

    try {
      emailSchema.parse(body.email)
    } catch (err) {
      return this.html(
        this.newConnection.companyFormInput({
          targetBox: {
            status: 'error',
            errorMessage: 'Email is not valid',
          },
          formStage: 'form',
        })
      )
    }

    let company: CompanyProfile

    let formStage: FormStage
    switch (body.submitButton) {
      case 'Back':
        formStage = 'form'
        break
      case 'Continue':
        formStage = 'confirmation'
        break
      case 'Submit':
        formStage = 'success'
        break
      default:
        this.setStatus(422)
        return this.html('sorry')
        break
    }
    body.submitButton === 'Back' ? 'form' : 'confirmation'

    try {
      company = await this.companyHouseEntity.getCompanyProfileByCompanyNumber(body.companyNumber)
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
    return this.html(
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
  }
}
