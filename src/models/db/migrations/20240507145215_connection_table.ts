import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const now = () => knex.fn.now()

  await knex.schema.createTable('connection', (def) => {
    def.uuid('id').defaultTo(knex.raw('uuid_generate_v4()'))
    def.string('company_name').notNullable()
    def
      .enum('status', ['pending', 'unverified', 'verified_them', 'verified_us', 'verified_both', 'disconnected'], {
        useNative: true,
        enumName: 'connection_status',
      })
      .defaultTo('pending')
    def.datetime('created_at').notNullable().defaultTo(now())
    def.datetime('updated_at').notNullable().defaultTo(now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('connection')
  await knex.schema.raw('DROP TYPE connection_status')
}
