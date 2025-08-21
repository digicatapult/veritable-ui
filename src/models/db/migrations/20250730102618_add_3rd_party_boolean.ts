import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('connection', (def) => {
    def.string('registry_code').notNullable()
  })
  await knex.schema.dropTable('organisation_registries')
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('connection', (def) => {
    def.dropColumn('registry_code')
  })
}
