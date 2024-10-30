import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex('query').del()

  await knex.schema.alterTable('query', (def) => {
    def.dropColumn('query_type')
    def.dropColumn('query_response')
    def
      .enum('type', ['total_carbon_embodiment'], {
        useNative: true,
        enumName: 'query_type',
      })
      .notNullable()

    def.jsonb('response').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex('query').del()

  await knex.schema.alterTable('query', (def) => {
    def.dropColumn('response')
    def.dropColumn('type')
    def.string('query_response').nullable()
    def.string('query_response').notNullable()
  })

  await knex.raw('DROP TYPE query_type')
}
