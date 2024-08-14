import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('query', (def) => {
    def.uuid('response_id').defaultTo(null)
    def.string('query_response').defaultTo(null)
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('query', (def) => {
    def.dropColumn('response_id')
    def.dropColumn('query_response')
  })
}
