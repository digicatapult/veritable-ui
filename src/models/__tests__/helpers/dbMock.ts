import { RegistryCountryCode } from '../../../controllers/connection/strings.js'
import Database from '../../db/index.js'
import { OrganisationRegistriesRow } from '../../db/types.js'

// Mock data for UK registry (Company House)
const ukRegistry: OrganisationRegistriesRow = {
  id: 'uk-registry-id',
  country_code: RegistryCountryCode.UK,
  registry_name: 'Company House',
  registry_key: 'company_house',
  url: 'http://localhost:8443',
  api_key: '',
  created_at: new Date(),
  updated_at: new Date(),
}

// Mock data for NY registry (Socrata)
const nyRegistry: OrganisationRegistriesRow = {
  id: 'ny-registry-id',
  country_code: RegistryCountryCode.NY,
  registry_name: 'Socrata',
  registry_key: 'socrata',
  url: 'http://localhost:8444',
  api_key: '',
  created_at: new Date(),
  updated_at: new Date(),
}

export const mockDb = {
  get: (tableName: string, where?: Record<string, string>) => {
    if (tableName === 'organisation_registries' && where?.country_code) {
      if (where.country_code === RegistryCountryCode.UK) {
        return Promise.resolve([ukRegistry])
      }
      if (where.country_code === RegistryCountryCode.NY) {
        return Promise.resolve([nyRegistry])
      }
    }
    return Promise.resolve([])
  },
} as unknown as Database
