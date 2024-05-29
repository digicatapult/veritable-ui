import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('connection', (def) => {
    def.index('updated_at', 'idx_connection_updated_at')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('connection', (def) => {
    def.dropIndex('updated_at', 'idx_connection_updated_at')
  })
}
