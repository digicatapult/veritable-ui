import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex('query').del()

  await knex.schema.alterTable('query', (def) => {
    def.dateTime('expires_at').nullable()
  })

  await knex('query').update({ expires_at: knex.raw("created_at + interval '7 days'") })

  await knex.schema.alterTable('query', (def) => {
    def.dateTime('expires_at').alter().notNullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex('query').del()

  await knex.schema.alterTable('query', (def) => {
    def.dropColumn('expires_at')
  })
}
