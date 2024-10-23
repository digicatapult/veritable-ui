import 'reflect-metadata'

import { container } from 'tsyringe'

import { Env } from './env/index.js'
import Server from './server.js'

import { Logger, type ILogger } from './logger.js'
import { CredentialSchema } from './models/credentialSchema.js'
import Database from './models/db/index.js'
;(async () => {
  const env = container.resolve(Env)
  const logger = container.resolve<ILogger>(Logger)
  const db = container.resolve(Database)

  const schema = container.resolve<CredentialSchema>(CredentialSchema)
  await schema.assertIssuanceRecords()

  try {
    await initializeSettings(logger, env, db)
    logger.info('Settings initialized successfully.')
  } catch (error) {
    logger.error('Error initializing settings:', error)
  }

  const { app } = await Server()

  app.listen(env.get('PORT'), () => {
    logger.info(`htmx-tsoa listening on ${env.get('PORT')} port`)
  })
})()

async function initializeSettings(logger: ILogger, env: Env, db: Database) {
  const settingsFromDb = await db.get('settings', {}, [])

  const settings = [
    {
      setting_key: 'company_name',
      setting_value: 'DIGITAL CATAPULT',
    },
    {
      setting_key: 'companies_house_number',
      setting_value: env.get('INVITATION_FROM_COMPANY_NUMBER') || '00000000',
    },
    {
      setting_key: 'postal_address',
      setting_value: 'Some Address',
    },
    {
      setting_key: 'from_email',
      setting_value: env.get('EMAIL_FROM_ADDRESS') || 'default@test.com',
    },
    {
      setting_key: 'admin_email',
      setting_value: env.get('EMAIL_ADMIN_ADDRESS') || 'default@test.com',
    },
  ]

  // Insert only the missing settings
  const existingKeys = settingsFromDb.map((row) => row.setting_key)
  const settingsToInsert = settings.filter((setting) => !existingKeys.includes(setting.setting_key))

  if (settingsToInsert.length > 0) {
    for (const setting of settingsToInsert) {
      try {
        await db.insert('settings', setting) // Insert row by row
        logger.debug(`Inserted new setting: ${setting.setting_key}: ${setting.setting_value}`)
      } catch (error) {
        logger.error(`Error inserting setting with key ${setting.setting_key}:`, error)
      }
    }
  } else {
    logger.debug('All settings already exist.')
  }
}
