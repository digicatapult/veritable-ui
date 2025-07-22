import { container } from 'tsyringe'
import { Env } from '../../src/env'
import Database from '../../src/models/db'

const env: Env = container.resolve(Env)

export async function insertCompanyHouseRegistry() {
  const db = container.resolve(Database)
  await db.insert('organisation_registries', {
    country_code: 'GB',
    registry_name: 'Company House',
    registry_key: 'company_house',
    url: env.get('COMPANY_HOUSE_API_URL'),
    api_key: '',
  })
}

export async function insertSocrataRegistry() {
  const db = container.resolve(Database)
  await db.insert('organisation_registries', {
    country_code: 'US',
    registry_name: 'Socrata',
    registry_key: 'socrata',
    url: env.get('SOCRATA_API_URL'),
    api_key: '',
  })
}

export async function cleanupRegistries() {
  const db = container.resolve(Database)
  await db.delete('organisation_registries', {})
}
