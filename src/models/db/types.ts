import { Knex } from 'knex'
import { z } from 'zod'
import { bavResponseData, carbonEmbodimentResponseData, subjectIdParser } from '../drpc.js'
import { countryCodes } from '../stringTypes.js'

export const tablesList = ['connection', 'connection_invite', 'query', 'query_rpc', 'settings'] as const
export const registryTypes = ['company_house', 'open_corporates', 'ny_state'] as const
export const registryKeyParser = z.enum(registryTypes)
export type RegistryType = (typeof registryTypes)[number]

const insertConnection = z.object({
  company_name: z.string(),
  company_number: z.string(),
  status: z.enum(['pending', 'unverified', 'verified_them', 'verified_us', 'verified_both', 'disconnected']),
  agent_connection_id: z.union([z.uuid(), z.null()]),
  pin_attempt_count: z.number().int().gte(0).lte(255),
  pin_tries_remaining_count: z.number().int().gte(0).lte(255).nullable(),
  registry_country_code: z.enum(countryCodes),
  registry_code: registryKeyParser,
  address: z.string(),
})

const insertConnectionInvite = z.object({
  connection_id: z.uuid(),
  oob_invite_id: z.uuid(),
  pin_hash: z.string(),
  expires_at: z.date(),
  validity: z.enum(['valid', 'expired', 'too_many_attempts', 'used']),
})

const queryTypes = ['total_carbon_embodiment', 'beneficiary_account_validation'] as const
export const queryTypeParser = z.enum(queryTypes)

export type QueryType = (typeof queryTypes)[number]

const insertQuery = z.object({
  connection_id: z.uuid(),
  parent_id: z.uuid().nullable().optional(),
  type: queryTypeParser,
  status: z.enum(['resolved', 'pending_your_input', 'pending_their_input', 'errored', 'forwarded']),
  response_id: z.uuid().nullable(),
  role: z.enum(['requester', 'responder']),
  expires_at: z.date(),
  details: z.object({
    subjectId: subjectIdParser,
  }),

  response: z.union([carbonEmbodimentResponseData, bavResponseData]).nullable(),
})

const defaultFields = z.object({
  id: z.uuid(),
  created_at: z.date(),
  updated_at: z.date(),
})

const insertQueryRpc = z.object({
  query_id: z.uuid(),
  agent_rpc_id: z.uuid(),
  role: z.enum(['client', 'server']),
  method: z.enum(['submit_query_request', 'submit_query_response']),
  result: z.union([z.record(z.any(), z.any()), z.null()]).optional(),
  error: z.union([z.record(z.any(), z.any()), z.null()]).optional(),
})
const insertSettings = z.object({
  setting_key: z.string(),
  setting_value: z.string(),
})

const Zod = {
  connection: {
    insert: insertConnection,
    get: insertConnection.extend(defaultFields.shape),
  },
  connection_invite: {
    insert: insertConnectionInvite,
    get: insertConnectionInvite.extend(defaultFields.shape),
  },
  query: {
    insert: insertQuery,
    get: insertQuery.extend(defaultFields.shape),
  },
  query_rpc: {
    insert: insertQueryRpc,
    get: insertQueryRpc.extend(defaultFields.shape),
  },
  settings: {
    insert: insertSettings,
    get: insertSettings.extend({
      id: z.uuid(),
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
