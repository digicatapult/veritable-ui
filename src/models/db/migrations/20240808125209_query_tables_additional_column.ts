import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('query', (def) => {
    def.uuid('query_id_for_response').defaultTo(null)
    def.string('query_response').defaultTo(null)
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('query', (def) => {
    def.dropColumn('query_id_for_response')
    def.dropColumn('query_response')
  })
}
