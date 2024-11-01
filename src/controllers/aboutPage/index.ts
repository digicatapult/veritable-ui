import { Get, Produces, Request, Route, Security, SuccessResponse } from 'tsoa'
import { injectable } from 'tsyringe'

import express from 'express'
import AboutPageTemplates from '../../views/aboutPage/about.js'
import { HTML, HTMLController } from '../HTMLController.js'

@injectable()
@Security('oauth2')
@Route('/about')
@Produces('text/html')
export class AboutPageController extends HTMLController {
  constructor(private aboutPageTemplates: AboutPageTemplates) {
    super()
  }

  /**
   * Retrieves the aboutPage
   */
  @SuccessResponse(200)
  @Get('/')
  public async aboutPage(@Request() req: express.Request): Promise<HTML> {
    req.log.trace('rendering about page')

    return this.html(this.aboutPageTemplates.aboutPage())
  }
}
