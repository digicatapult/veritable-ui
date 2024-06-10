import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('connection', (def) => {
    def.string('agent_connection_id').nullable().defaultTo(null)
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('connection', (def) => {
    def.dropColumn('agent_connection_id')
  })
}
