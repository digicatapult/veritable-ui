import { OauthError } from '@digicatapult/tsoa-oauth-express'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import express, { Express } from 'express'
import { pinoHttp as requestLogger } from 'pino-http'
import { SwaggerUiOptions, serve, setup } from 'swagger-ui-express'
import { container } from 'tsyringe'

import { randomUUID } from 'crypto'
import { ValidateError } from 'tsoa'
import { Env } from './env/index.js'
import { ForbiddenError, HttpError, InternalError } from './errors.js'
import { ILogger, Logger } from './logger.js'
import { UUID } from './models/stringTypes.js'
import { RegisterRoutes } from './routes.js'
import ConnectionEvents from './services/connectionEvents.js'
import CredentialEvents from './services/credentialEvents/index.js'
import DrpcEvents from './services/drpcEvents/index.js'
import VeritableCloudagentEvents from './services/veritableCloudagentEvents.js'
import loadApiSpec from './swagger.js'
import { errorToast } from './views/errors/errors.js'

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

function getRedirectUrl(req: express.Request) {
  const parsedUrl = new URL(req.originalUrl, env.get('PUBLIC_URL'))
  if (parsedUrl.pathname !== '/auth/redirect') {
    return req.originalUrl
  }

  const fallbackUrl = new URL('/', parsedUrl).toString()

  const maybeState = parsedUrl.searchParams.get('state')
  if (!maybeState) {
    return fallbackUrl
  }

  const [cookieSuffix] = maybeState.split('.')
  if (!cookieSuffix) {
    return fallbackUrl
  }

  const { [`VERITABLE_REDIRECT.${cookieSuffix}`]: formerRedirect } = req.signedCookies
  if (!formerRedirect) {
    return fallbackUrl
  }

  return formerRedirect
}

export default async (startEvents: boolean = true) => {
  const logger = container.resolve<ILogger>(Logger)

  container.resolve(ConnectionEvents).start()
  container.resolve(CredentialEvents).start()
  container.resolve(DrpcEvents).start()
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
      serializers: {
        // removing cookie from being logged since it contains refresh and access token
        req: ({ id, headers, ...req }: { id: UUID; headers: Record<string, string> }) => ({
          ...req,
          headers: {},
        }),
        res: (res) => {
          delete res.headers
          return res
        },
      },
      genReqId: function (req: express.Request, res: express.Response): UUID {
        const id: UUID = (req.headers['x-request-id'] as UUID) || (req.id as UUID) || randomUUID()

        res.setHeader('x-request-id', id)
        return id
      },
      quietReqLogger: true,
      customAttributeKeys: {
        reqId: 'req_id',
      },
    })
  )

  app.use(express.urlencoded({ extended: true }))
  app.use(express.json())
  app.use(compression())
  app.use(cookieParser(env.get('COOKIE_SESSION_KEYS')))

  app.use('/public', express.static('public'))
  app.use('/lib/htmx.org', express.static('node_modules/htmx.org/dist'))
  app.use('/lib/htmx-ext-json-enc/json-enc.js', express.static('node_modules/htmx-ext-json-enc/json-enc.js'))
  app.use(
    '/lib/htmx-ext-response-targets/response-targets.js',
    express.static('node_modules/htmx-ext-response-targets/response-targets.js')
  )

  const apiSpec = await loadApiSpec(env)
  app.get('/api-docs', (_req, res) => {
    res.json(apiSpec)
  })
  app.use('/swagger', serve, setup(undefined, options))

  RegisterRoutes(app)

  app.use(function errorHandler(
    err: unknown,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void {
    if (err instanceof Error) {
      req.log.debug('API error: %s', err.message)
      req.log.trace('API error: stack %s', err.stack ?? 'no stack trace')
    } else {
      req.log.debug(err, 'API error')
    }

    if (err instanceof ForbiddenError || err instanceof OauthError) {
      if (req.headers['hx-request']) {
        res.status(401).json({
          message: 'Unauthorised',
        })
        return
      }

      const redirect = new URL(`${env.get('PUBLIC_URL')}/auth/login`)
      redirect.search = new URLSearchParams({
        path: getRedirectUrl(req),
      }).toString()

      return res.redirect(302, redirect.toString())
    }

    if (err instanceof HttpError) {
      req.log.error(`Caught HttpError for ${req.path}: ${err.message}`)
    }

    if (err instanceof InternalError) {
      req.log.error(`Caught Internal Error for ${req.path}: ${err.message}`)
    }

    if (err instanceof ValidateError) {
      req.log.error(`Caught Validation Error for ${req.path}:`)
    }

    if (err instanceof Error) {
      req.log.error(`Caught Unknown Error for ${req.path}: ${err.message}`)
    }

    const code = err instanceof HttpError ? err.code : 500
    const toast = errorToast(err)

    res.setHeader('HX-Reswap', 'afterbegin')
    // // really ugly workaround for https://github.com/bigskysoftware/htmx/issues/2518
    res.setHeader('HX-Reselect', ':not(* > *)')
    res.setHeader('Content-Type', 'text/html')
    res.setHeader('HX-Trigger-After-Settle', JSON.stringify({ veritableError: { dialogId: toast.dialogId } }))
    res.status(code).send(toast.response)

    next()
  })

  return { app, cloudagentEvents }
}
