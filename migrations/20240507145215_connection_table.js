/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
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

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTable('connection')
}
