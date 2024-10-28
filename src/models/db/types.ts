import { Knex } from 'knex'
import { z } from 'zod'

export const tablesList = ['connection', 'connection_invite', 'query', 'query_rpc', 'settings'] as const

const insertConnection = z.object({
  company_name: z.string(),
  company_number: z.string(),
  status: z.union([
    z.literal('pending'),
    z.literal('unverified'),
    z.literal('verified_them'),
    z.literal('verified_us'),
    z.literal('verified_both'),
    z.literal('disconnected'),
  ]),
  agent_connection_id: z.union([z.string(), z.null()]),
  pin_attempt_count: z.number().int().gte(0).lte(255),
  pin_tries_remaining_count: z.number().int().gte(0).lte(255).nullable(),
})

const insertConnectionInvite = z.object({
  connection_id: z.string(),
  oob_invite_id: z.string(),
  pin_hash: z.string(),
  expires_at: z.date(),
  validity: z.union([z.literal('valid'), z.literal('expired'), z.literal('too_many_attempts'), z.literal('used')]),
})
const insertQuery = z.object({
  connection_id: z.string(),
  parent_id: z.string().nullable().optional(),
  query_type: z.string(),
  status: z.enum(['resolved', 'pending_your_input', 'pending_their_input', 'errored', 'forwarded']),
  details: z.record(z.any()),
  response_id: z.string().nullable(),
  query_response: z.string().nullable(),
  role: z.enum(['requester', 'responder']),
})
const insertQueryRpc = z.object({
  query_id: z.string(),
  agent_rpc_id: z.string(),
  role: z.union([z.literal('client'), z.literal('server')]),
  method: z.union([z.literal('submit_query_request'), z.literal('submit_query_response')]),
  result: z.union([z.record(z.any()), z.null()]).optional(),
  error: z.union([z.record(z.any()), z.null()]).optional(),
})
const insertSettings = z.object({
  setting_key: z.string(),
  setting_value: z.string(),
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
  query: {
    insert: insertQuery,
    get: insertQuery.extend({
      id: z.string(),
      created_at: z.date(),
      updated_at: z.date(),
    }),
  },
  query_rpc: {
    insert: insertQueryRpc,
    get: insertQueryRpc.extend({
      id: z.string(),
      created_at: z.date(),
      updated_at: z.date(),
    }),
  },
  settings: {
    insert: insertSettings,
    get: insertSettings.extend({
      id: z.string(),
      created_at: z.date(),
      updated_at: z.date(),
    }),
  },
}

export type InsertConnection = z.infer<typeof Zod.connection.insert>
export type ConnectionRow = z.infer<typeof Zod.connection.get>
export type QueryRow = z.infer<typeof Zod.query.get>
export type SettingsRow = z.infer<typeof Zod.settings.get>

export type TABLES_TUPLE = typeof tablesList
export type TABLE = TABLES_TUPLE[number]
export type Models = {
  [key in TABLE]: {
    get: z.infer<(typeof Zod)[key]['get']>
    insert: z.infer<(typeof Zod)[key]['insert']>
  }
}

export type ColumnsByType<M extends TABLE, T> = {
  [K in keyof Models[M]['get']]-?: Models[M]['get'][K] extends T ? K : never
}[keyof Models[M]['get']]

type WhereComparison<M extends TABLE> = {
  [key in keyof Models[M]['get']]: [
    Extract<key, string>,
    '=' | '>' | '>=' | '<' | '<=' | '<>' | 'LIKE' | 'ILIKE',
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
