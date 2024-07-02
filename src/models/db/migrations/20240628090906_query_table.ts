import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const now = () => knex.fn.now()

  await knex.schema.createTable('query', (def) => {
    def.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary()
    def.uuid('connection_id').notNullable()
    def.string('query_type').notNullable()
    def
      .enum('status', ['resolved', 'pending_your_input', 'pending_their_input'], {
        useNative: true,
        enumName: 'query_status',
      })
      .notNullable()
      .notNullable()
    def.datetime('created_at').notNullable().defaultTo(now())
    def.datetime('updated_at').notNullable().defaultTo(now())

    def.foreign('connection_id').references('id').inTable('connection').onDelete('CASCADE').onUpdate('CASCADE')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('query')
  await knex.schema.raw('DROP TYPE query_status')
}
