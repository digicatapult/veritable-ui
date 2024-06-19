import 'reflect-metadata'

import { Express } from 'express'
import { container } from 'tsyringe'

import { Env } from './env.js'
import Server from './server.js'

import { logger } from './logger.js'
import ConnectionEvents from './services/connectionEvents.js'
import VeritableCloudagentEvents from './services/veritableCloudagentEvents.js'
;(async () => {
  const app: Express = await Server()

  container.resolve(ConnectionEvents).start()
  const cloudagentEvents = container.resolve(VeritableCloudagentEvents)
  cloudagentEvents.start()

  const env = container.resolve(Env)

  app.listen(env.get('PORT'), () => {
    logger.info(`htmx-tsoa listening on ${env.get('PORT')} port`)
  })
})()
