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

    // make random state. We use a cookie suffix so we can handle multiple simultaneous pages on the same site
    const cookieSuffix = randomBytes(16).toString('base64url')
    const nonce = randomBytes(32).toString('base64url')
    res.cookie(`VERITABLE_NONCE.${cookieSuffix}`, nonce, nonceCookieOpts)

    // setup for final redirect. We also check if we're in a redirect loop where we'll redirect back to the redirect. If so just go to root
    const parsedPath = new URL(path, this.env.get('PUBLIC_URL'))
    const veritableRedirect = parsedPath.pathname === '/auth/redirect' ? this.env.get('PUBLIC_URL') : path
    res.cookie(`VERITABLE_REDIRECT.${cookieSuffix}`, veritableRedirect, nonceCookieOpts)

    const redirect = new URL(this.idp.authorizationEndpoint('PUBLIC'))
    redirect.search = new URLSearchParams({
      response_type: 'code',
      client_id: this.env.get('IDP_CLIENT_ID'),
      redirect_uri: this.redirectUrl,
      state: `${cookieSuffix}.${nonce}`,
      scope: 'openid',
    }).toString()

    this.logger.debug('login redirect to %s', redirect)
    res.redirect(302, redirect.toString())
  }

  @Get('/redirect')
  @SuccessResponse(302, 'Redirect')
  public async redirect(@Request() req: express.Request, @Query() state: string, @Query() code: string): Promise<void> {
    const { res } = req
    if (!res) {
      throw new InternalError()
    }
    const [cookieSuffix, redirectNonce] = state.split('.')
    if (!cookieSuffix || !redirectNonce) {
      throw new ForbiddenError('Format of state parameter incorrect')
    }

    const { [`VERITABLE_NONCE.${cookieSuffix}`]: cookieNonce, [`VERITABLE_REDIRECT.${cookieSuffix}`]: cookieRedirect } =
      req.signedCookies

    if (redirectNonce !== cookieNonce) {
      throw new ForbiddenError('State parameter did not match expected nonce')
    }

    const { access_token, refresh_token } = await this.idp.getTokenFromCode(code, this.redirectUrl)

    res.clearCookie(`VERITABLE_NONCE.${cookieSuffix}`)
    res.clearCookie(`VERITABLE_REDIRECT.${cookieSuffix}`)
    res.cookie('VERITABLE_ACCESS_TOKEN', access_token, tokenCookieOpts)
    res.cookie('VERITABLE_REFRESH_TOKEN', refresh_token, tokenCookieOpts)

    const redirect = cookieRedirect || `${this.env.get('PUBLIC_URL')}`

    this.logger.debug('auth redirect to %s', redirect)
    res.redirect(302, redirect)
  }
}
