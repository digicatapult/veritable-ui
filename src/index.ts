import 'reflect-metadata'

import { container } from 'tsyringe'

import { Env } from './env.js'
import Server from './server.js'

import { Logger, type ILogger } from './logger.js'
import { CredentialSchema } from './models/credentialSchema.js'
;(async () => {
  const env = container.resolve(Env)
  const logger = container.resolve<ILogger>(Logger)

  const schema = container.resolve<CredentialSchema>(CredentialSchema)
  await schema.assertIssuanceRecords()

  const { app } = await Server()

  app.listen(env.get('PORT'), () => {
    logger.info(`htmx-tsoa listening on ${env.get('PORT')} port`)
  })
})()
