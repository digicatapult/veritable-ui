import mkExpressAuthentication, { type AuthOptions } from '@digicatapult/tsoa-oauth-express'
import type * as express from 'express'
import { container } from 'tsyringe'

import IDPService from './models/idpService.js'

const idp = container.resolve(IDPService)

const tokenCookieOpts: express.CookieOptions = {
  sameSite: true,
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true,
  signed: true,
  secure: true,
}

const tokenStore: AuthOptions = {
  jwksUri: () => idp.jwksUri,
  getAccessToken: async (req) => req.signedCookies['VERITABLE_ACCESS_TOKEN'],
  getScopesFromToken: async (decoded) => {
    if (typeof decoded === 'string') {
      return []
    }
    const { scopes } = decoded
    if (typeof scopes !== 'string') {
      return []
    }
    return scopes.split(' ')
  },
  tryRefreshTokens: async (req) => {
    const refreshToken = req.signedCookies['VERITABLE_REFRESH_TOKEN']
    const res = req.res
    if (!refreshToken || !res) {
      return false
    }

    try {
      const { access_token, refresh_token } = await idp.getTokenFromRefresh(refreshToken)
      res.cookie('VERITABLE_ACCESS_TOKEN', access_token, tokenCookieOpts)
      res.cookie('VERITABLE_REFRESH_TOKEN', refresh_token, tokenCookieOpts)
      return true
    } catch (err) {
      return false
    }
  },
}

export const expressAuthentication = mkExpressAuthentication(tokenStore)
