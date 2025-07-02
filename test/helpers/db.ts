import { container } from 'tsyringe'

import knex from 'knex'
import Database from '../../src/models/db/index.js'
import { tablesList } from '../../src/models/db/types.js'
import { aliceDbConfig } from './fixtures.js'

const db = container.resolve(Database)

export async function cleanupDatabase() {
  tablesList.forEach(async (table) => await db.delete(table, {}))
}

const database = knex(aliceDbConfig)

export async function migrateDatabase() {
  try {
    await database.migrate.latest()
  } catch (error) {
    throw new Error(`Unknown error in db migratiion ${error}`)
  }
}
