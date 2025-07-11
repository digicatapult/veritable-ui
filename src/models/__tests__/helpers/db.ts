import { container } from 'tsyringe'
import { Env } from '../../../env'
import Database from '../../db'

const env: Env = container.resolve(Env)
// export async function cleanupRegistries() {
//   const db = container.resolve(Database)
//   await db.delete('organisation_registries', {})
// }

// export async function insertCompanyHouseRegistry() {
//   const db = container.resolve(Database)
//   await db.insert('organisation_registries', {
//     country_code: 'UK',
//     registry_name: 'Company House',
//     registry_key: 'company_house',
//     url: env.get('COMPANY_HOUSE_API_URL'),
//     api_key: '',
//   })
// }

export async function insertSocrataRegistry() {
  const db = container.resolve(Database)
  await db.insert('organisation_registries', {
    country_code: 'NY',
    registry_name: 'Socrata',
    registry_key: 'socrata',
    url: env.get('SOCRATA_API_URL'),
    api_key: '',
  })
}
