import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.raw("ALTER TYPE query_status ADD VALUE 'forwarded'")
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('ALTER TYPE query_status RENAME TO query_status_old')
  await knex.raw('ALTER TABLE query RENAME COLUMN status TO status_old')
  await knex.schema.alterTable('query', (def) => {
    def
      .enum('status', ['resolved', 'pending_your_input', 'pending_their_input', 'errored'], {
        useNative: true,
        enumName: 'query_status',
      })
      .nullable()
  })
  await knex.raw('UPDATE query SET status = status_old::text::query_status')
  await knex.schema.alterTable('query', (def) => {
    def
      .enum('status', ['resolved', 'pending_your_input', 'pending_their_input', 'errored'], {
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
}
