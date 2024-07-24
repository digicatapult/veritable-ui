import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('connection', (def) => {
    def.tinyint('local_pin_attempt_count').unsigned().notNullable().defaultTo(0)
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('connection', (def) => {
    def.dropColumn('local_pin_attempt_count')
  })
}
