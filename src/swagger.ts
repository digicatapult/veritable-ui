import fs from 'node:fs/promises'

import path from 'node:path'
import { Env } from './env.js'

/**
 * Monkey-patch the generated swagger JSON so that when it is valid for the deployed environment
 * @param env Environment containing configuration for monkey-patching the swagger
 * @returns OpenAPI spec object
 */
export default async function loadApiSpec(env: Env): Promise<unknown> {
  const API_SWAGGER_HEADING = env.get('API_SWAGGER_HEADING')
  const authorizationUrl = `${env.get('IDP_PUBLIC_URL_PREFIX')}${env.get('IDP_AUTH_PATH')}`
  const tokenUrl = `${env.get('IDP_PUBLIC_URL_PREFIX')}${env.get('IDP_TOKEN_PATH')}`

  const swaggerBuffer = await fs.readFile(path.join('src/swagger.json'))
  const swaggerJson = JSON.parse(swaggerBuffer.toString('utf8'))
  swaggerJson.info.title += `:${API_SWAGGER_HEADING}`
  swaggerJson.components.securitySchemes.oauth2.flows.authorizationCode.authorizationUrl = authorizationUrl
  swaggerJson.components.securitySchemes.oauth2.flows.authorizationCode.tokenUrl = tokenUrl
  swaggerJson.components.securitySchemes.oauth2.flows.authorizationCode.refreshUrl = tokenUrl

  return swaggerJson
}
