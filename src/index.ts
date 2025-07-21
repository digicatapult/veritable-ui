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

  try {
    await initializeOrganisationRegistries(logger, env, db)
    logger.info('Organisation registries initialized successfully.')
  } catch (error) {
    logger.error('Error initializing organisation registries:', error)
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
      setting_key: 'admin_email',
      setting_value: env.get('EMAIL_ADMIN_ADDRESS') || 'default@test.com',
    },
    {
      setting_key: 'local_registry_to_use',
      setting_value: env.get('LOCAL_REGISTRY_TO_USE') || 'GB',
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
async function initializeOrganisationRegistries(logger: ILogger, env: Env, db: Database) {
  const organisationRegistriesFromDb = await db.get('organisation_registries', {}, [])

  const organisationRegistries = [
    {
      country_code: 'GB',
      registry_name: 'Company House',
      registry_key: 'company_house',
      url: env.get('COMPANY_HOUSE_API_URL') || 'https://api.company-information.service.gov.uk',
      api_key: '',
    },
    {
      country_code: 'US',
      registry_name: 'Socrata',
      registry_key: 'socrata',
      url: env.get('SOCRATA_API_URL') || 'https://data.ny.gov/resource/p66s-i79p.json',
      api_key: '',
    },
  ]

  // Insert only the missing registries
  const existingKeys = organisationRegistriesFromDb.map((row) => row.registry_key)
  const registriesToInsert = organisationRegistries.filter((registry) => !existingKeys.includes(registry.registry_key))

  if (registriesToInsert.length > 0) {
    for (const registry of registriesToInsert) {
      try {
        await db.insert('organisation_registries', registry)
        logger.debug(`Inserted new registry: ${registry.registry_key}: ${registry.registry_name}`)
      } catch (error) {
        logger.error(`Error inserting registry with key ${registry.registry_key}:`, error)
      }
    }
  } else {
    logger.debug('All pre-configured registries already exist.')
  }
}
