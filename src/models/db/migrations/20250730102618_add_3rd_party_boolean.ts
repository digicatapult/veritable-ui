import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('connection', (def) => {
    def
      .enum('registry_code', ['company_house', 'open_corporates', 'ny_state'], {
        useNative: true,
        enumName: 'registry_type',
      })
      .defaultTo('company_house')
      .nullable()
  })

  await knex.schema.dropTable('organisation_registries')
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('connection', (def) => {
    def.dropColumn('registry_code')
  })
  await knex.raw('DROP TYPE registry_type')
}
