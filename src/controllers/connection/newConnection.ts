import { Get, Produces, Query, Route, Security, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { Logger, type ILogger } from '../../logger.js'
import CompantHouseEntity from '../../models/companyHouseEntity.js'
import NewConnectionTemplates from '../../views/newConnection.js'
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
}
