import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('organisation_registries', (def) => {
    def.boolean('third_party').notNullable().defaultTo(false)
  })
  await knex.schema.alterTable('connection', (def) => {
    def.string('registry_code').notNullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('connection', (def) => {
    def.dropColumn('registry_code')
  })
}
