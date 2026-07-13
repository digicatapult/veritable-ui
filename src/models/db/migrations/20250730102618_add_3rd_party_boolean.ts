import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('connection', (def) => {
    def
      .enum('registry_code', ['company_house', 'open_corporates', 'ny_state'], {
        useNative: true,
        enumName: 'registry_type',
      })
      .defaultTo('company_house')
      .notNullable()
  })

  await knex.schema.dropTable('organisation_registries')
}

export async function down(knex: Knex): Promise<void> {
  // The up dropped organisation_registries; recreate it here so this down
  // reverses the up (and so the earlier migration's own down can drop it).
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
    def.dropColumn('registry_code')
  })
  await knex.raw('DROP TYPE registry_type')
}
