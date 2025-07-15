import { Env } from '../../src/env/index.js'

export const alice = {
  company_number: '07964699',
  company_name: 'DIGITAL CATAPULT',
  registered_office_address: {
    address_line_1: 'Level 9, 101 Euston Road',
    country: 'United Kingdom',
    locality: 'London',
    postal_code: 'NW1 2RA',
  },
  registered_office_is_in_dispute: false,
  company_status: 'active',
}

export const bob = {
  company_number: '04659351',
  company_name: 'OFFSHORE RENEWABLE ENERGY CATAPULT',
  registered_office_address: {
    address_line_1: 'Offshore House',
    address_line_2: 'Albert Street',
    locality: 'Blyth',
    postal_code: 'NE24 1LZ',
    region: 'Northumberland',
  },
  registered_office_is_in_dispute: false,
  company_status: 'active',
}

export const charlie = {
  company_number: '10016023',
  company_name: 'OFFSHORE RENEWABLE ENERGY CATAPULT',
  registered_office_address: {
    address_line_1: "12th Floor Tower Wing Guy's Hospital",
    address_line_2: 'Great Maze Pond',
    country: 'United Kingdom',
    locality: 'London',
    postal_code: 'SE1 9RT',
  },
  registered_office_is_in_dispute: false,
  company_status: 'active',
}

export const aliceDbConfig = {
  client: 'pg',
  connection: {
    host: 'localhost',
    database: 'veritable-ui',
    user: 'postgres',
    password: 'postgres',
    port: 5432,
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: 'migrations',
    directory: 'src/models/db/migrations',
  },
}

export const bobDbConfig = {
  client: 'pg',
  connection: {
    host: 'localhost',
    database: 'veritable-ui',
    user: 'postgres',
    password: 'postgres',
    port: 5433,
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: 'migrations',
  },
}

export const charlieDbConfig = {
  client: 'pg',
  connection: {
    host: 'localhost',
    database: 'veritable-ui',
    user: 'postgres',
    password: 'postgres',
    port: 5434,
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: 'migrations',
  },
}

export const mockEnvBob = {
  get(name) {
    if (name === 'PORT') {
      return 3001
    }
    if (name === 'CLOUDAGENT_ADMIN_ORIGIN') {
      return 'http://localhost:3101'
    }
    throw new Error('Unexpected env variable request')
  },
} as Env

export const mockEnvCharlie = {
  get(name) {
    if (name === 'PORT') {
      return 3002
    }
    if (name === 'CLOUDAGENT_ADMIN_ORIGIN') {
      return 'http://localhost:3102'
    }
    throw new Error('Unexpected env variable request')
  },
} as Env

export const socrataCompany = {
  dos_id: '3211809',
  current_entity_name: '00:02:59 LLC',
  initial_dos_filing_date: '2005-05-31T00:00:00.000',
  county: 'Kings',
  jurisdiction: 'New York',
  entity_type: 'DOMESTIC LIMITED LIABILITY COMPANY',
  dos_process_name: '00:02:59 LLC',
  dos_process_address_1: '656 UNION STREET, APT. 2',
  dos_process_city: 'BROOKLYN',
  dos_process_state: 'NY',
  dos_process_zip: '11215',
}
