import { Knex } from 'knex'
import { z } from 'zod'
import { carbonEmbodimentRequestData, carbonEmbodimentResponseData } from '../drpc.js'

export const tablesList = [
  'connection',
  'connection_invite',
  'query',
  'query_rpc',
  'settings',
  'organisation_registries',
] as const

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
  registry_country_code: z.string(),
})

const insertOrganisationRegistries = z.object({
  country_code: z.string(),
  registry_name: z.string(),
  registry_key: z.string(),
  url: z.string(),
  api_key: z.string(),
})
const insertConnectionInvite = z.object({
  connection_id: z.string(),
  oob_invite_id: z.string(),
  pin_hash: z.string(),
  expires_at: z.date(),
  validity: z.union([z.literal('valid'), z.literal('expired'), z.literal('too_many_attempts'), z.literal('used')]),
})

const insertQueryShared = z.object({
  connection_id: z.string(),
  parent_id: z.string().nullable().optional(),
  type: z.literal('total_carbon_embodiment'),
  status: z.enum(['resolved', 'pending_your_input', 'pending_their_input', 'errored', 'forwarded']),
  response_id: z.string().nullable(),
  role: z.enum(['requester', 'responder']),
  expires_at: z.date(),
})
const totalCarbonEmbodimentQuery = z.object({
  type: z.literal('total_carbon_embodiment'),
  details: carbonEmbodimentRequestData,
  response: carbonEmbodimentResponseData.nullable(),
})
const insertQuery = z.discriminatedUnion('type', [totalCarbonEmbodimentQuery.merge(insertQueryShared)])

const defaultFields = z.object({
  id: z.string(),
  created_at: z.date(),
  updated_at: z.date(),
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
    get: insertConnection.merge(defaultFields),
  },
  connection_invite: {
    insert: insertConnectionInvite,
    get: insertConnectionInvite.merge(defaultFields),
  },
  query: {
    insert: insertQuery,
    get: z.discriminatedUnion('type', [totalCarbonEmbodimentQuery.merge(insertQueryShared).merge(defaultFields)]),
  },
  query_rpc: {
    insert: insertQueryRpc,
    get: insertQueryRpc.merge(defaultFields),
  },
  settings: {
    insert: insertSettings,
    get: insertSettings.extend({
      id: z.string(),
      created_at: z.date(),
      updated_at: z.date(),
    }),
  },
  organisation_registries: {
    insert: insertOrganisationRegistries,
    get: insertOrganisationRegistries.extend({
      id: z.string(),
    }),
  },
}

export type InsertConnection = z.infer<typeof Zod.connection.insert>
export type ConnectionRow = z.infer<typeof Zod.connection.get>
export type QueryRow = z.infer<typeof Zod.query.get>
export type SettingsRow = z.infer<typeof Zod.settings.get>
export type OrganisationRegistriesRow = z.infer<typeof Zod.organisation_registries.get>
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
