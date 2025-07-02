import { Env } from '../../src/env/index.js'

export const alice = {
  registered_office_address: {
    address_line_1: 'Level 9, 101 Euston Road',
    country: 'United Kingdom',
    locality: 'London',
    postal_code: 'NW1 2RA',
  },
  company_status: 'active',
  registered_office_is_in_dispute: false,
  company_name: 'DIGITAL CATAPULT',
  company_number: '07964699',
}

export const bob = {
  registered_office_address: {
    address_line_1: 'Offshore House',
    address_line_2: 'Albert Street',
    locality: 'Blyth',
    postal_code: 'NE24 1LZ',
    region: 'Northumberland',
  },
  company_status: 'active',
  registered_office_is_in_dispute: false,
  company_name: 'OFFSHORE RENEWABLE ENERGY CATAPULT',
  company_number: '04659351',
}

export const charlie = {
  registered_office_address: {
    address_line_1: "12th Floor Tower Wing Guy's Hospital",
    address_line_2: 'Great Maze Pond',
    country: 'United Kingdom',
    locality: 'London',
    postal_code: 'SE1 9RT',
  },
  company_status: 'active',
  registered_office_is_in_dispute: false,
  company_name: 'OFFSHORE RENEWABLE ENERGY CATAPULT',
  company_number: '10016023',
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

export const mockEnvAlice = {
  get(name) {
    if (name === 'PORT') {
      return 3000
    }
    if (name === 'CLOUDAGENT_ADMIN_ORIGIN') {
      return 'http://localhost:3100'
    }
    throw new Error('Unexpected env variable request')
  },
} as Env

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
