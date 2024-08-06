import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const now = () => knex.fn.now()

  await knex.schema.alterTable('query', (def) => {
    def.jsonb('details').notNullable().alter()
  })

  await knex.schema.createTable('query_rpc', (def) => {
    def.uuid('id').notNullable().defaultTo(knex.raw('uuid_generate_v4()')).primary()
    def.uuid('query_id').notNullable()
    def.string('agent_rpc_id').notNullable()
    def
      .enum('role', ['client', 'server'], {
        useNative: true,
        enumName: 'query_rpc_role',
      })
      .notNullable()
    def
      .enum('method', ['submit_query_request', 'submit_query_response'], {
        useNative: true,
        enumName: 'query_rpc_method',
      })
      .notNullable()
    def.jsonb('result').nullable()
    def.jsonb('error').nullable()
    def.datetime('created_at').notNullable().defaultTo(now())
    def.datetime('updated_at').notNullable().defaultTo(now())

    def.foreign('query_id').references('id').inTable('query').onDelete('CASCADE').onUpdate('CASCADE')
  })

  await knex.raw("ALTER TYPE query_status ADD VALUE 'errored'")
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('ALTER TYPE query_status RENAME TO query_status_old')
  await knex.raw('ALTER TABLE query RENAME COLUMN status TO status_old')
  await knex.schema.alterTable('query', (def) => {
    def
      .enum('status', ['resolved', 'pending_your_input', 'pending_their_input'], {
        useNative: true,
        enumName: 'query_status',
      })
      .nullable()
  })
  await knex.raw('UPDATE query SET status = status_old::text::query_status')
  await knex.schema.alterTable('query', (def) => {
    def
      .enum('status', ['resolved', 'pending_your_input', 'pending_their_input'], {
        useNative: true,
        existingType: true,
        enumName: 'query_status',
      })
      .notNullable()
      .alter({
        alterType: false,
        alterNullable: true,
      })

    def.dropColumn('status_old')
  })
  await knex.raw('DROP TYPE query_status_old')

  await knex.schema.dropTable('query_rpc')

  await knex.schema.alterTable('query', (def) => {
    def.string('details').notNullable().alter()
  })
}
