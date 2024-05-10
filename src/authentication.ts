import type * as express from 'express'
import * as jwt from 'jsonwebtoken'
import jwksClient, { type JwksClient } from 'jwks-rsa'
import { container } from 'tsyringe'

import { ILogger, Logger } from './logger.js'
import IDPService from './models/idpService.js'

const idp = container.resolve(IDPService)

const logger = container.resolve<ILogger>(Logger)

type verifyResolve = [jwt.VerifyErrors | null, string | jwt.JwtPayload | undefined]

const tokenCookieOpts: express.CookieOptions = {
  sameSite: true,
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true,
  signed: true,
  secure: true,
}

export class ForbiddenError extends Error {
  constructor(message?: string) {
    super(message)
  }

  get code(): number {
    return 401
  }
}

let client: JwksClient
const assertClient = async (): Promise<JwksClient> => {
  if (!client) {
    client = jwksClient({
      jwksUri: await idp.jwksUri,
      requestHeaders: {}, // Optional
      timeout: 30000, // Defaults to 30s
    })
  }
  return client
}

export async function expressAuthentication(
  request: express.Request,
  securityName: string,
  _scopes?: string[]
): Promise<void> {
  const client = await assertClient()

  if (securityName !== 'oauth2') {
    return
  }

  const { VERITABLE_ACCESS_TOKEN: accessToken, VERITABLE_REFRESH_TOKEN: refreshToken } = request.signedCookies
  if (typeof accessToken !== 'string') {
    // 401
    throw new ForbiddenError()
  }

  const getKey: jwt.GetPublicKeyOrSecret = (header, callback) => {
    client.getSigningKey(header.kid, function (err, key) {
      if (err || !key) {
        callback(err || new Error())
        return
      }
      callback(null, key.getPublicKey())
    })
  }

  const [err, result] = await new Promise<verifyResolve>((resolve) => {
    jwt.verify(accessToken, getKey, {}, function (err, decoded) {
      resolve([err, decoded])
    })
  })
  logger.trace('Authentication token: %j', result)

  if (!err) {
    return
  }

  const { res } = request
  if (!(err instanceof jwt.TokenExpiredError) || !refreshToken || !res) {
    throw new ForbiddenError()
  }

  const { access_token, refresh_token } = await idp.getTokenFromRefresh(refreshToken)

  res.cookie('VERITABLE_ACCESS_TOKEN', access_token, tokenCookieOpts)
  res.cookie('VERITABLE_REFRESH_TOKEN', refresh_token, tokenCookieOpts)
}
