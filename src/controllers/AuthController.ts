import type * as express from 'express'

import { randomBytes } from 'node:crypto'
import { Get, Hidden, Produces, Query, Request, Route, SuccessResponse } from 'tsoa'
import { injectable } from 'tsyringe'

import { Env } from '../env/index.js'
import { ForbiddenError, InternalError } from '../errors.js'
import IDPService from '../models/idpService.js'
import { HTMLController } from './HTMLController.js'

const localDomains = new Set(['localhost', '127.0.0.1', '[::1]', 'veritable-ui-alice', 'veritable-ui-bob'])

/**
 * Authentication controller for logging a user in. The flow of this is as follows:
 *
 * 1. user navigates to any authentication route say the connections page `/connections`
 * 2. user is unauthenticated and redirected to `/auth/login`. This sets up some state in cookies and then
 * 3. user is redirected to the idp and logs in
 * 4. user is redirected to `/auth/callback`. Callback returns 200 and then uses a `refresh` header to navigate to `/auth/redirect`
 * 5. `/auth/redirect` will then complete the oauth2 flow, validate the state from the IDP, and store auth token cookies
 * 6. user will be redirected back to the original page they visited in this case `/connections`
 *
 */
@injectable()
@Route('/auth')
@Produces('text/html')
@Hidden()
export class AuthController extends HTMLController {
  private callbackUrl: string
  private redirectUrl: string
  private nonceCookieOpts: express.CookieOptions = {
    sameSite: true,
    maxAge: 10 * 60 * 1000,
    httpOnly: true,
    signed: true,
    secure: true,
    path: '/auth/redirect',
  }

  private tokenCookieOpts: express.CookieOptions = {
    sameSite: true,
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    signed: true,
    secure: true,
  }

  constructor(
    private env: Env,
    private idp: IDPService
  ) {
    super()
    this.callbackUrl = `${env.get('PUBLIC_URL')}/auth/callback`
    this.redirectUrl = `${env.get('PUBLIC_URL')}/auth/redirect`

    if (localDomains.has(new URL(env.get('PUBLIC_URL')).hostname)) {
      this.nonceCookieOpts.secure = false
      this.tokenCookieOpts.secure = false
    }
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
    res.cookie(`VERITABLE_NONCE.${cookieSuffix}`, nonce, this.nonceCookieOpts)
    req.log.debug('storing VERITABLE_NONCE cookie %s', cookieSuffix)

    // setup for final redirect. We also check if we're in a redirect loop where we'll redirect back to the redirect. If so just go to root
    const parsedPath = new URL(path, this.env.get('PUBLIC_URL'))
    const veritableRedirect = parsedPath.pathname === '/auth/redirect' ? this.env.get('PUBLIC_URL') : path
    res.cookie(`VERITABLE_REDIRECT.${cookieSuffix}`, veritableRedirect, this.nonceCookieOpts)
    req.log.debug('storing VERITABLE_REDIRECT cookie %s', cookieSuffix)

    const redirect = new URL(this.idp.authorizationEndpoint('PUBLIC'))
    redirect.search = new URLSearchParams({
      response_type: 'code',
      client_id: this.env.get('IDP_CLIENT_ID'),
      redirect_uri: this.callbackUrl,
      state: `${cookieSuffix}.${nonce}`,
      scope: 'openid',
    }).toString()

    req.log.debug('login redirect to %s', redirect)
    res.redirect(302, redirect.toString())
  }

  /**
   * Callback is used to avoid issues with same site cookies when the IDP is on another host.
   * What can happen is the redirect back from the IDP (302) makes the request to the redirect
   * endpoint, but because the request originated from the IDP the cookies aren't sent. This endpoint therefore
   * uses a "refresh" header to make sure cookies are sent.
   */
  @Get('/callback')
  @SuccessResponse(200, 'Redirect')
  public async callback(
    @Request() req: express.Request,
    @Query() state: string,
    @Query() code?: string,
    @Query() error?: string
  ): Promise<void> {
    const redirect = new URL(this.redirectUrl)
    redirect.search = new URLSearchParams({
      state,
      ...(code ? { code } : {}),
      ...(error ? { error } : {}),
    }).toString()

    req.log.debug('Login callback will redirect to %s', redirect)

    this.setHeader('Refresh', `0; url=${redirect.toString()}`)
    this.setStatus(200)
    return
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
      req.log.warn('incorrect format of state parameter %j', { cookieSuffix, redirectNonce })
      throw new ForbiddenError('Format of state parameter incorrect')
    }

    const { [`VERITABLE_NONCE.${cookieSuffix}`]: cookieNonce, [`VERITABLE_REDIRECT.${cookieSuffix}`]: cookieRedirect } =
      req.signedCookies

    if (redirectNonce !== cookieNonce) {
      throw new ForbiddenError('State parameter did not match expected nonce')
    }

    const redirect = cookieRedirect || `${this.env.get('PUBLIC_URL')}`

    if (error || !code) {
      req.log.warn('unexpected error returned from keycloak error: %s code: %s', error, code)
      // redirect to essentially retry the login flow. At some point we should maintain a count for these to then redirect to an error page
      res.redirect(302, redirect)
      return
    }

    const { access_token, refresh_token } = await this.idp.getTokenFromCode(code, this.callbackUrl)

    req.log.debug(
      'resetting cookies: VERITABLE_NONCE, VERITABLE_REDIRECT, VERITABLE_ACCESS_TOKEN, VERITABLE_REFRESH_TOKEN'
    )
    res.clearCookie(`VERITABLE_NONCE.${cookieSuffix}`, { path: this.nonceCookieOpts.path })
    res.clearCookie(`VERITABLE_REDIRECT.${cookieSuffix}`, { path: this.nonceCookieOpts.path })
    res.cookie('VERITABLE_ACCESS_TOKEN', access_token, this.tokenCookieOpts)
    res.cookie('VERITABLE_REFRESH_TOKEN', refresh_token, this.tokenCookieOpts)

    req.log.debug('auth redirect to %s', redirect)
    res.redirect(302, redirect)
  }
}
