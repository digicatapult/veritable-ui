import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('connection', (def) => {
    def.tinyint('pin_attempt_count').unsigned().notNullable().defaultTo(0)
  })

  await knex.schema.alterTable('connection_invite', (def) => {
    def
      .enum('validity', ['valid', 'expired', 'too_many_attempts', 'used'], {
        useNative: true,
        enumName: 'connection_invite_verification_status',
      })
      .defaultTo('valid')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('connection', (def) => {
    def.dropColumn('pin_attempt_count')
  })

  await knex.schema.alterTable('connection_invite', (def) => {
    def.dropColumn('validity')
  })

  await knex.raw('DROP TYPE connection_invite_verification_status')
}
