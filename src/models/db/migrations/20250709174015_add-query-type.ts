import { Knex } from 'knex'

export const up = async (knex: Knex): Promise<void> => {
  await knex.raw('ALTER TYPE "query_type" ADD VALUE \'beneficiary_account_validation\'')
}

export const down = async (knex: Knex): Promise<void> => {
  await knex.raw('ALTER TYPE "query_type" REMOVE VALUE \'beneficiary_account_validation\'')
}
