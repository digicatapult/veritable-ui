import bodyParser from 'body-parser'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import express, { Express } from 'express'
import fs from 'fs/promises'
import path from 'path'
import requestLogger from 'pino-http'
import { SwaggerUiOptions, serve, setup } from 'swagger-ui-express'
import { container } from 'tsyringe'

import { Env } from './env.js'
import { logger } from './logger.js'
import { RegisterRoutes } from './routes.js'

export default async (): Promise<Express> => {
  const swaggerBuffer = await fs.readFile(path.join(__dirname, './swagger.json'))
  const swaggerJson = JSON.parse(swaggerBuffer.toString('utf8'))

  const env = container.resolve(Env)
  const app: Express = express()

  const options: SwaggerUiOptions = {
    swaggerOptions: { url: '/api-docs', oauth: { usePkceWithAuthorizationCodeGrant: true } },
  }

  app.use(
    requestLogger({
      logger,
    })
  )

  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(bodyParser.json())
  app.use(compression())
  app.use(cookieParser(env.get('COOKIE_SESSION_KEYS')))

  RegisterRoutes(app)

  app.use('/public', express.static('public'))
  app.use('/lib/htmx.org', express.static('node_modules/htmx.org/dist'))
  app.get('/api-docs', (_req, res) => res.json(swaggerJson))
  app.use('/swagger', serve, setup(undefined, options))

  return app
}
