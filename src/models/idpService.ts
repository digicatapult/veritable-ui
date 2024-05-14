import { inject, injectable, singleton } from 'tsyringe'
import { Env } from '../env'

import { z } from 'zod'
import { ForbiddenError } from '../errors.js'
import { Logger, type ILogger } from '../logger'

const oidcConfig = z.object({
  issuer: z.string(),
  authorization_endpoint: z.string(),
  token_endpoint: z.string(),
  introspection_endpoint: z.string(),
  userinfo_endpoint: z.string(),
  end_session_endpoint: z.string(),
  jwks_uri: z.string(),
})
type IOidcConfig = z.infer<typeof oidcConfig>

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

@singleton()
@injectable()
export default class IDPService {
  private config?: IOidcConfig

  constructor(
    private env: Env,
    @inject(Logger) private logger: ILogger
  ) {}

  private async fetchConfig() {
    const getConfigResponse = await fetch(this.env.get('IDP_OIDC_CONFIG_URL'))
    if (!getConfigResponse.ok) {
      this.logger.error('Error fetching OIDC config (%s)', getConfigResponse.statusText)
      this.logger.trace('Error fetching OIDC config body: %s', await getConfigResponse.text())
      return
    }

    try {
      this.config = oidcConfig.parse(await getConfigResponse.json())
    } catch (err) {
      if (err instanceof Error) {
        this.logger.error('Error parsing OIDC config: %s', err.message)
        return
      }
      this.logger.error('Error parsing OIDC config: unknown')
    }
  }

  private async fetchConfigValue(field: keyof IOidcConfig) {
    if (this.config) {
      return this.config[field]
    }
    await this.fetchConfig()
    if (!this.config) {
      throw new Error('Oidc config was not loaded')
    }
    return this.config[field]
  }

  get issuer(): Promise<string> {
    return this.fetchConfigValue('issuer')
  }
  get authorizationEndpoint(): Promise<string> {
    return this.fetchConfigValue('authorization_endpoint')
  }
  get tokenEndpoint(): Promise<string> {
    return this.fetchConfigValue('token_endpoint')
  }
  get introspectionEndpoint(): Promise<string> {
    return this.fetchConfigValue('introspection_endpoint')
  }
  get userinfoEndpoint(): Promise<string> {
    return this.fetchConfigValue('userinfo_endpoint')
  }
  get endSessionEndpoint(): Promise<string> {
    return this.fetchConfigValue('end_session_endpoint')
  }
  get jwksUri(): Promise<string> {
    return this.fetchConfigValue('jwks_uri')
  }

  async getTokenFromCode(code: string, redirectUrl: string) {
    const tokenReq = await fetch(await this.tokenEndpoint, {
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
    const tokenReq = await fetch(await this.tokenEndpoint, {
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
