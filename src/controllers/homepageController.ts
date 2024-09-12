import { Get, Produces, Route, Security, SuccessResponse } from 'tsoa'
import { injectable, singleton } from 'tsyringe'

import HomepageTemplates from '../views/homepage/homepage.js'
import { HTML, HTMLController } from './HTMLController.js'

@singleton()
@injectable()
@Security('oauth2')
@Route('/')
@Produces('text/html')
export class HomepageController extends HTMLController {
  constructor(private homepageTemplates: HomepageTemplates) {
    super()
  }

  /**
   * Retrieves the homepage
   */
  @SuccessResponse(200)
  @Get('/')
  public async homepage(): Promise<HTML> {
    return this.html(this.homepageTemplates.homepage())
  }
}
