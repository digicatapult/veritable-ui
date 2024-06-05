import { Knex } from 'knex'
import { z } from 'zod'

export const tablesList = ['connection', 'connection_invite'] as const

const insertConnection = z.object({
  company_name: z.string(),
  company_number: z.string(),
  connection_id: z.string().optional(),
  status: z.union([
    z.literal('pending'),
    z.literal('unverified'),
    z.literal('verified_them'),
    z.literal('verified_us'),
    z.literal('verified_both'),
    z.literal('disconnected'),
  ]),
})

const insertConnectionInvite = z.object({
  connection_id: z.string(),
  oob_invite_id: z.string(),
  pin_hash: z.string(),
  expires_at: z.date(),
})

const Zod = {
  connection: {
    insert: insertConnection,
    get: insertConnection.extend({
      id: z.string(),
      created_at: z.date(),
      updated_at: z.date(),
    }),
  },
  connection_invite: {
    insert: insertConnectionInvite,
    get: insertConnectionInvite.extend({
      id: z.string(),
      created_at: z.date(),
      updated_at: z.date(),
    }),
  },
}

const { connection } = Zod

export type InsertConnection = z.infer<typeof connection.insert>
export type ConnectionRow = z.infer<typeof connection.get>

export type TABLES_TUPLE = typeof tablesList
export type TABLE = TABLES_TUPLE[number]
export type Models = {
  [key in TABLE]: {
    get: z.infer<(typeof Zod)[key]['get']>
    insert: z.infer<(typeof Zod)[key]['insert']>
  }
}

type WhereComparison<M extends TABLE> = {
  [key in keyof Models[M]['get']]: [
    Extract<key, string>,
    '=' | '>' | '>=' | '<' | '<=' | '<>' | 'LIKE' | 'ILIKE' | '~',
    Extract<Models[M]['get'][key], Knex.Value>,
  ]
}
export type WhereMatch<M extends TABLE> = {
  [key in keyof Models[M]['get']]?: Models[M]['get'][key]
}

export type Where<M extends TABLE> = WhereMatch<M> | (WhereMatch<M> | WhereComparison<M>[keyof Models[M]['get']])[]
export type Order<M extends TABLE> = [keyof Models[M]['get'], 'asc' | 'desc'][]
export type Update<M extends TABLE> = Partial<Models[M]['get']>
export type IDatabase = {
  [key in TABLE]: () => Knex.QueryBuilder
}

export default Zod
