import { container } from 'tsyringe'

import knex from 'knex'
import { Env } from '../../src/env/index.js'
import Database from '../../src/models/db/index.js'

const db = container.resolve(Database)

export const cleanup = async () => {
  await db.delete('query', {})
  await db.delete('connection', {})
  await db.delete('settings', {})
}

const env = container.resolve(Env)

const database = knex({
  client: 'pg',
  connection: {
    host: env.get('DB_HOST'),
    database: env.get('DB_NAME'),
    user: env.get('DB_USERNAME'),
    password: env.get('DB_PASSWORD'),
    port: env.get('DB_PORT'),
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: 'migrations',
    directory: 'src/models/db/migrations',
  },
})

export async function migrateDatabase() {
  try {
    await database.migrate.latest()
  } catch (error) {
    throw new Error(`Unknown error in db migratiion ${error}`)
  }
}
