import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const now = () => knex.fn.now()

  await knex.schema.createTable('organisation_registries', (def) => {
    def.uuid('id').defaultTo(knex.raw('uuid_generate_v4()'))
    def.string('country_code').notNullable()
    def.string('registry_key').notNullable()
    def.string('registry_name').notNullable()
    def.string('url')
    def.string('api_key')
    def.datetime('created_at').notNullable().defaultTo(now())
    def.datetime('updated_at').notNullable().defaultTo(now())
  })
  await knex.schema.alterTable('connection', (def) => {
    def.string('registry_country_code').defaultTo('GB').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('organisation_registries')

  await knex.schema.alterTable('connection', (def) => {
    def.dropColumn('registry_country_code')
  })
}
