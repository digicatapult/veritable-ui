import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('query', (def) => {
    def.string('parent_id').defaultTo(null)
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('query', (def) => {
    def.dropColumn('query_id')
  })
}
