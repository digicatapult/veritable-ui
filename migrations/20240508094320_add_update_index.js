/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('connection', (def) => {
    def.index('updated_at', 'idx_connection_updated_at')
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('connection', (def) => {
    def.dropIndex('updated_at', 'idx_connection_updated_at')
  })
}
