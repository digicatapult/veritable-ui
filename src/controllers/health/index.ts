import express from 'express'
import { Get, Hidden, Request, Route, SuccessResponse } from 'tsoa'
import { injectable, singleton } from 'tsyringe'

import { Env } from '../../env.js'

type Response = {
  status: 'ok'
  details: {
    title: string
    url: string
  }
}

@singleton()
@injectable()
@Route('/health')
@Hidden()
export class HealthController {
  constructor(private env: Env) {}
  /**
   * Retrieves the connection list page
   */
  @SuccessResponse(200)
  @Get('/')
  public get(@Request() req: express.Request): Response {
    req.log.debug('request from %s agent', req?.headers['user-agent'])

    return {
      status: 'ok',
      details: {
        title: this.env.get('API_SWAGGER_TITLE'),
        url: this.env.get('PUBLIC_URL'),
      },
    }
  }
}
