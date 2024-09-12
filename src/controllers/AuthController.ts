import type * as express from 'express'

import { randomBytes } from 'node:crypto'
import { Get, Hidden, Produces, Query, Request, Route, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'
import { Logger, type ILogger } from '../logger.js'

import { Env } from '../env.js'
import { ForbiddenError, InternalError } from '../errors.js'
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

  constructor(
    private env: Env,
    private idp: IDPService,
    @inject(Logger) private logger: ILogger
  ) {
    super()
    this.redirectUrl = `${env.get('PUBLIC_URL')}/auth/redirect`
    this.logger = logger.child({ controller: '/auth' })
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
    this.logger.debug('storing VERITABLE_NONCE cookie %s', cookieSuffix)

    // setup for final redirect. We also check if we're in a redirect loop where we'll redirect back to the redirect. If so just go to root
    const parsedPath = new URL(path, this.env.get('PUBLIC_URL'))
    const veritableRedirect = parsedPath.pathname === '/auth/redirect' ? this.env.get('PUBLIC_URL') : path
    res.cookie(`VERITABLE_REDIRECT.${cookieSuffix}`, veritableRedirect, nonceCookieOpts)
    this.logger.debug('storing VERITABLE_REDIRECT cookie %s', cookieSuffix)

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
  public async redirect(
    @Request() req: express.Request,
    @Query() state: string,
    @Query() code?: string,
    @Query() error?: string
  ): Promise<void> {
    const { res } = req
    if (!res) {
      throw new InternalError('Result not found on request')
    }
    const [cookieSuffix, redirectNonce] = state.split('.')
    if (!cookieSuffix || !redirectNonce) {
      this.logger.debug('incorect format of state parameter %j', { cookieSuffix, redirectNonce })
      throw new ForbiddenError('Format of state parameter incorrect')
    }

    const { [`VERITABLE_NONCE.${cookieSuffix}`]: cookieNonce, [`VERITABLE_REDIRECT.${cookieSuffix}`]: cookieRedirect } =
      req.signedCookies

    if (redirectNonce !== cookieNonce) {
      throw new ForbiddenError('State parameter did not match expected nonce')
    }

    const redirect = cookieRedirect || `${this.env.get('PUBLIC_URL')}`

    if (error || !code) {
      this.logger.info('Unexpected error returned from keycloak error: %s code: %s', error, code)
      // redirect to essentially retry the login flow. At some point we should maintain a count for these to then redirect to an error page
      res.redirect(302, redirect)
      return
    }

    const { access_token, refresh_token } = await this.idp.getTokenFromCode(code, this.redirectUrl)

    res.clearCookie(`VERITABLE_NONCE.${cookieSuffix}`)
    res.clearCookie(`VERITABLE_REDIRECT.${cookieSuffix}`)
    res.cookie('VERITABLE_ACCESS_TOKEN', access_token, tokenCookieOpts)
    res.cookie('VERITABLE_REFRESH_TOKEN', refresh_token, tokenCookieOpts)

    this.logger.debug('auth redirect to %s', redirect)
    res.redirect(302, redirect)
  }
}
