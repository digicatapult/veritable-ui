import { OauthError } from '@digicatapult/tsoa-oauth-express'
import bodyParser from 'body-parser'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import express, { Express } from 'express'
import { pinoHttp as requestLogger } from 'pino-http'
import { SwaggerUiOptions, serve, setup } from 'swagger-ui-express'
import { container } from 'tsyringe'

import { ValidateError } from 'tsoa'
import { Env } from './env.js'
import { ForbiddenError, HttpError } from './errors.js'
import { ILogger, Logger } from './logger.js'
import { RegisterRoutes } from './routes.js'
import ConnectionEvents from './services/connectionEvents.js'
import VeritableCloudagentEvents from './services/veritableCloudagentEvents.js'
import loadApiSpec from './swagger.js'

const env = container.resolve(Env)

const API_SWAGGER_BG_COLOR = env.get('API_SWAGGER_BG_COLOR')
const API_SWAGGER_TITLE = env.get('API_SWAGGER_TITLE')

const customCssToInject: string = `
  body { background-color: ${API_SWAGGER_BG_COLOR}; }
  .swagger-ui .scheme-container { background-color: inherit; }
  .swagger-ui .opblock .opblock-section-header { background: inherit; }
  .topbar { display: none; }
  .swagger-ui .btn.authorize { background-color: #f7f7f7; }
  .swagger-ui .opblock.opblock-post { background: rgba(73,204,144,.3); }
  .swagger-ui .opblock.opblock-get { background: rgba(97,175,254,.3); }
  .swagger-ui .opblock.opblock-put { background: rgba(252,161,48,.3); }
  .swagger-ui .opblock.opblock-delete { background: rgba(249,62,62,.3); }
  .swagger-ui section.models { background-color: #f7f7f7; }
`

export default async (startEvents: boolean = true) => {
  const logger = container.resolve<ILogger>(Logger)

  container.resolve(ConnectionEvents).start()
  const cloudagentEvents = container.resolve(VeritableCloudagentEvents)
  if (startEvents) {
    await cloudagentEvents.start()
  }

  const app: Express = express()

  const options: SwaggerUiOptions = {
    swaggerOptions: {
      url: '/api-docs',
      oauth: { clientId: env.get('IDP_CLIENT_ID'), usePkceWithAuthorizationCodeGrant: true },
    },
    customCss: customCssToInject,
    customSiteTitle: API_SWAGGER_TITLE,
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

  const apiSpec = await loadApiSpec(env)
  app.get('/api-docs', (_req, res) => res.json(apiSpec))
  app.use('/swagger', serve, setup(undefined, options))

  RegisterRoutes(app)

  app.use(function errorHandler(
    err: unknown,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): express.Response | void {
    if (err instanceof Error) {
      logger.debug('API error: %s', err.message)
      logger.trace('API error: stack %j', err.stack)
    } else {
      logger.debug('API error: %s', err?.toString())
    }

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

  return { app, cloudagentEvents }
}
