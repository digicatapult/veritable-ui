import { container } from 'tsyringe'
import { Env } from '../../../env/index.js'
import Database from '../../db/index.js'
import { OrganisationRegistriesRow } from '../../db/types.js'
import { CountryCode } from '../../stringTypes.js'

const env: Env = container.resolve(Env)

// Mock data for UK registry (Company House)
const ukRegistry: OrganisationRegistriesRow = {
  id: 'uk-registry-id',
  country_code: 'GB' as CountryCode,
  registry_name: 'Company House',
  registry_key: 'company_house',
  url: env.get('COMPANY_HOUSE_API_URL'),
  api_key: '',
  created_at: new Date(),
  updated_at: new Date(),
  third_party: false,
}

// Mock data for NY registry (Socrata)
const nyRegistry: OrganisationRegistriesRow = {
  id: 'ny-registry-id',
  country_code: 'US' as CountryCode,
  registry_name: 'Socrata',
  registry_key: 'socrata',
  url: env.get('SOCRATA_API_URL'),
  api_key: '',
  created_at: new Date(),
  updated_at: new Date(),
  third_party: false,
}

export const mockDb = {
  get: (tableName: string, where?: Record<string, string>) => {
    if (tableName === 'organisation_registries' && where?.country_code) {
      if (where.country_code === 'GB') {
        return Promise.resolve([ukRegistry])
      }
      if (where.country_code === 'US') {
        return Promise.resolve([nyRegistry])
      }
    }
    return Promise.resolve([])
  },
} as unknown as Database
