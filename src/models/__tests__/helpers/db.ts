import { container } from 'tsyringe'
import { Env } from '../../../env'
import Database from '../../db'

const env: Env = container.resolve(Env)

export function cleanupRegistries() {
  const db = container.resolve(Database)
  db.delete('organisation_registries', {})
}

export function insertCompanyHouseRegistry() {
  const db = container.resolve(Database)
  db.insert('organisation_registries', {
    country_code: 'UK',
    registry_name: 'Company House',
    registry_key: 'company_house',
    url: env.get('COMPANY_HOUSE_API_URL'),
    api_key: '',
  })
}
