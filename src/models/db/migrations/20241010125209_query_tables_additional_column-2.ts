import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('query', (def) => {
    def.uuid('parent_id').nullable().defaultTo(null)
    def
      .foreign('parent_id', 'fk_partial_query_parent_id')
      .references('id')
      .inTable('query')
      .onDelete('cascade')
      .onUpdate('cascade')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('query', (def) => {
    def.dropColumn('parent_id')
  })
}
