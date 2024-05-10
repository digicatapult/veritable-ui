import bodyParser from 'body-parser'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import express, { Express } from 'express'
import fs from 'fs/promises'
import path from 'path'
import requestLogger from 'pino-http'
import { SwaggerUiOptions, serve, setup } from 'swagger-ui-express'
import { container } from 'tsyringe'

import { ValidateError } from 'tsoa'
import { ForbiddenError } from './authentication.js'
import { Env } from './env.js'
import { ILogger, Logger } from './logger.js'
import { RegisterRoutes } from './routes.js'

export default async (): Promise<Express> => {
  const swaggerBuffer = await fs.readFile(path.join(__dirname, './swagger.json'))
  const swaggerJson = JSON.parse(swaggerBuffer.toString('utf8'))

  const env = container.resolve(Env)
  const logger = container.resolve<ILogger>(Logger)
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

  app.use('/public', express.static('public'))
  app.use('/lib/htmx.org', express.static('node_modules/htmx.org/dist'))
  app.get('/api-docs', (_req, res) => res.json(swaggerJson))
  app.use('/swagger', serve, setup(undefined, options))

  RegisterRoutes(app)

  app.use(function errorHandler(
    err: unknown,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): express.Response | void {
    if (err instanceof ForbiddenError) {
      if (req.headers['hx-request']) {
        return res.status(401).json({
          message: 'Unauthorised',
        })
      }

      return res.redirect(302, '/auth/login')
    }
    // TODO: make errors render something pretty
    if (err instanceof ValidateError) {
      logger.warn(`Caught Validation Error for ${req.path}:`, err.fields)
      return res.status(422).json({
        message: 'Validation Failed',
        details: err?.fields,
      })
    }
    if (err instanceof Error) {
      return res.status(500).json({
        message: 'Internal Server Error',
      })
    }

    next()
  })

  return app
}
