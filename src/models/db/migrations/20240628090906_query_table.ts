import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const now = () => knex.fn.now()

  await knex.schema.createTable('queries', (def) => {
    def.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary()
    def.uuid('connection_id').notNullable()
    def.string('company_name').notNullable()
    def.string('query_type').notNullable()
    def
      .enum('direction', ['Sent', 'Received'], {
        useNative: true,
        enumName: 'query_direction',
      })
      .notNullable()
    def
      .enum('status', ['Resolved', 'Pending Your Input', 'Pending Their Input'], {
        useNative: true,
        enumName: 'query_status',
      })
      .notNullable()
    def
      .enum('action_items', ['View Details', 'Respond'], {
        useNative: true,
        enumName: 'query_action_items',
      })
      .notNullable()
    def.datetime('created_at').notNullable().defaultTo(now())
    def.datetime('updated_at').notNullable().defaultTo(now())

    def.foreign('connection_id').references('id').inTable('connection')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('queries')
  await knex.schema.raw('DROP TYPE query_status')
}
