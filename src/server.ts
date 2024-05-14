import { OauthError } from '@digicatapult/tsoa-oauth-express'
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
import { Env } from './env.js'
import { ForbiddenError, HttpError } from './errors.js'
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
  app.get('/', (_, res) => res.sendStatus(404))

  RegisterRoutes(app)

  app.use(function errorHandler(
    err: unknown,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): express.Response | void {
    if (err instanceof ForbiddenError || err instanceof OauthError) {
      if (req.headers['hx-request']) {
        return res.status(401).json({
          message: 'Unauthorised',
        })
      }

      const redirect = new URL(`${env.get('PUBLIC_URL')}/auth/login`)
      redirect.search = new URLSearchParams({
        path: req.originalUrl,
      }).toString()

      return res.redirect(302, redirect.toString())
    }

    if (err instanceof HttpError) {
      return res.status(err.code).send({
        message: err.message,
      })
    }

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
