import type * as express from 'express'

import { randomBytes } from 'node:crypto'
import { Get, Produces, Query, Request, Route, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { Env } from '../env.js'
import { ForbiddenError, InternalError } from '../errors.js'
import { Logger, type ILogger } from '../logger.js'
import IDPService from '../models/idpService.js'
import { HTMLController } from './HTMLController.js'

function base64URLEncode(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

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
export class AuthController extends HTMLController {
  private redirectUrl: string

  constructor(
    private env: Env,
    private idp: IDPService,
    @inject(Logger) private logger: ILogger
  ) {
    super()
    this.logger = logger.child({ controller: '/' })
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

    this.logger.debug('HEADERS: %j', req.headers)

    // make random state
    const nonce = base64URLEncode(randomBytes(32))
    res.cookie('VERITABLE_NONCE', nonce, nonceCookieOpts)

    // setup for final redirect
    res.cookie('VERITABLE_REDIRECT', path, nonceCookieOpts)

    const redirect = new URL(await this.idp.authorizationEndpoint)
    redirect.search = new URLSearchParams({
      response_type: 'code',
      client_id: this.env.get('IDP_CLIENT_ID'),
      redirect_uri: this.redirectUrl,
      state: nonce,
      scope: 'openid',
    }).toString()

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

    res.redirect(302, VERITABLE_REDIRECT || `${this.env.get('PUBLIC_URL')}/connection`)
  }
}
