import type * as express from 'express'

import { randomBytes } from 'node:crypto'
import { Get, Hidden, Produces, Query, Request, Route, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { Env } from '../env.js'
import { ForbiddenError, InternalError } from '../errors.js'
import { Logger, type ILogger } from '../logger.js'
import IDPService from '../models/idpService.js'
import { HTMLController } from './HTMLController.js'

const nonceCookieOpts: express.CookieOptions = {
  sameSite: true,
  httpOnly: true,
  signed: true,
  secure: true,
  path: '/auth/redirect',
}

const tokenCookieOpts: express.CookieOptions = {
  sameSite: true,
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true,
  signed: true,
  secure: true,
}

@singleton()
@injectable()
@Route('/auth')
@Produces('text/html')
@Hidden()
export class AuthController extends HTMLController {
  private redirectUrl: string
  private logger: ILogger

  constructor(
    private env: Env,
    private idp: IDPService,
    @inject(Logger) logger: ILogger
  ) {
    super()
    this.logger = logger.child({ controller: '/auth' })
    this.redirectUrl = `${env.get('PUBLIC_URL')}/auth/redirect`
  }

  /**
   * Retrieves the root page for the site
   */
  @Get('/login')
  @SuccessResponse(302, 'Redirect')
  public async login(@Request() req: express.Request, @Query() path: string): Promise<void> {
    const { res } = req
    if (!res) {
      throw new InternalError()
    }

    // make random state
    const nonce = randomBytes(32).toString('base64url')
    res.cookie('VERITABLE_NONCE', nonce, nonceCookieOpts)

    // setup for final redirect
    res.cookie('VERITABLE_REDIRECT', path, nonceCookieOpts)

    const redirect = new URL(this.idp.authorizationEndpoint('PUBLIC'))
    redirect.search = new URLSearchParams({
      response_type: 'code',
      client_id: this.env.get('IDP_CLIENT_ID'),
      redirect_uri: this.redirectUrl,
      state: nonce,
      scope: 'openid',
    }).toString()

    this.logger.debug('login redirect to %s', redirect)
    res.redirect(302, redirect.toString())
  }

  @Get('/redirect')
  @SuccessResponse(302, 'Redirect')
  public async redirect(@Request() req: express.Request, @Query() state: string, @Query() code: string): Promise<void> {
    const {
      res,
      signedCookies: { VERITABLE_NONCE, VERITABLE_REDIRECT },
    } = req
    if (!res) {
      throw new InternalError()
    }
    if (state !== VERITABLE_NONCE) {
      throw new ForbiddenError()
    }

    const { access_token, refresh_token } = await this.idp.getTokenFromCode(code, this.redirectUrl)

    res.clearCookie('VERITABLE_NONCE')
    res.clearCookie('VERITABLE_REDIRECT')
    res.cookie('VERITABLE_ACCESS_TOKEN', access_token, tokenCookieOpts)
    res.cookie('VERITABLE_REFRESH_TOKEN', refresh_token, tokenCookieOpts)

    const redirect = VERITABLE_REDIRECT || `${this.env.get('PUBLIC_URL')}`

    this.logger.debug('auth redirect to %s', redirect)
    res.redirect(302, redirect)
  }
}
