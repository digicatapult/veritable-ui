import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const [extInstalled] = await knex('pg_extension').select('*').where({ extname: 'pg_trgm' })

  if (!extInstalled) await knex.raw('CREATE EXTENSION "pg_trgm"')
  await knex.raw('CREATE INDEX company_name_trgm_idx on connection USING GIN(company_name gin_trgm_ops)')
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX company_name_trgm_idx')
  await knex.raw('DROP EXTENSION "pg_trgm"')
}
