import { Knex } from 'knex'

export const up = async (knex: Knex): Promise<void> => {
  // IF NOT EXISTS keeps this idempotent: the value is already present on any
  // database where this migration previously ran, and the up/down/up rollback
  // check re-applies it after a rollback.
  await knex.raw('ALTER TYPE "query_type" ADD VALUE IF NOT EXISTS \'beneficiary_account_validation\'')
}

export const down = async (_knex: Knex): Promise<void> => {
  // PostgreSQL cannot remove a value from an enum type, so this migration is
  // intentionally irreversible. The previous down used `ALTER TYPE ... REMOVE
  // VALUE`, which is not valid SQL and failed on rollback.
}
