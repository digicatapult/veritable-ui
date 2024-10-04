import { inject, injectable, singleton } from 'tsyringe'
import { Env } from '../env/index.js'

import { z } from 'zod'
import { ForbiddenError } from '../errors.js'
import { Logger, type ILogger } from '../logger.js'

const tokenResponse = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_expires_in: z.number(),
  refresh_token: z.string(),
  token_type: z.string(),
  'not-before-policy': z.number(),
  session_state: z.string(),
  scope: z.string(),
})

type fromNetwork = 'PUBLIC' | 'INTERNAL'

@singleton()
@injectable()
export default class IDPService {
  constructor(
    private env: Env,
    @inject(Logger) private logger: ILogger
  ) {}

  authorizationEndpoint(fromNetwork: fromNetwork): string {
    return `${this.env.get(fromNetwork === 'PUBLIC' ? 'IDP_PUBLIC_URL_PREFIX' : 'IDP_INTERNAL_URL_PREFIX')}${this.env.get('IDP_AUTH_PATH')}`
  }
  tokenEndpoint(fromNetwork: fromNetwork): string {
    return `${this.env.get(fromNetwork === 'PUBLIC' ? 'IDP_PUBLIC_URL_PREFIX' : 'IDP_INTERNAL_URL_PREFIX')}${this.env.get('IDP_TOKEN_PATH')}`
  }
  jwksUri(fromNetwork: fromNetwork): string {
    return `${this.env.get(fromNetwork === 'PUBLIC' ? 'IDP_PUBLIC_URL_PREFIX' : 'IDP_INTERNAL_URL_PREFIX')}${this.env.get('IDP_JWKS_PATH')}`
  }

  async getTokenFromCode(code: string, redirectUrl: string) {
    const tokenReq = await fetch(this.tokenEndpoint('INTERNAL'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.env.get('IDP_CLIENT_ID'),
        code,
        redirect_uri: redirectUrl,
      }),
    })

    if (!tokenReq.ok) {
      throw new ForbiddenError()
    }

    return this.parseTokenResponse(tokenReq)
  }

  async getTokenFromRefresh(refreshToken: string) {
    const tokenReq = await fetch(this.tokenEndpoint('INTERNAL'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.env.get('IDP_CLIENT_ID'),
      }),
    })

    if (!tokenReq.ok) {
      throw new ForbiddenError()
    }

    return this.parseTokenResponse(tokenReq)
  }

  async parseTokenResponse(response: Response) {
    try {
      return tokenResponse.parse(await response.json())
    } catch (err) {
      this.logger.error('Unexpected error parsing token response %s', err instanceof Error ? err.message : 'unknown')
      throw new ForbiddenError()
    }
  }
}
