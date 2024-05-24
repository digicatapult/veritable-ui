/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const now = () => knex.fn.now()

  await knex.schema.alterTable('connection', (def) => {
    def.string('company_number').notNullable()

    def.primary('id')
    def.index('company_number', 'idx_connection_company_number')
  })

  await knex.schema.createTable('connection_invite', (def) => {
    def.uuid('id').defaultTo(knex.raw('uuid_generate_v4()'))
    def.uuid('connection_id').notNullable()
    def.uuid('oob_invite_id').notNullable()
    def.string('pin_hash').notNullable()
    def.datetime('expires_at').notNullable()
    def.datetime('created_at').notNullable().defaultTo(now())
    def.datetime('updated_at').notNullable().defaultTo(now())

    def.index('oob_invite_id', 'idx_connection_invite_oob_invite_id')
    def
      .foreign('connection_id', 'fk_connection_invite_connection_id_connection_id')
      .references('id')
      .inTable('connection')
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTable('connection_invite')

  await knex.schema.alterTable('connection', (def) => {
    def.dropIndex('company_number', 'idx_connection_company_number')
    def.dropColumn('company_number')
  })
}
