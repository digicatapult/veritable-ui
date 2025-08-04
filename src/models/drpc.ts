import z from 'zod'
import { QueryType } from './db/types'
import { BIC, CountryCode, countryCodes } from './stringTypes.js'

export const ProductAndQuantity = z.object({
  idType: z.literal('product_and_quantity'),
  content: z.object({
    productId: z.string(),
    quantity: z.number().int().gte(1),
  }),
})

const Bav = z.object({
  idType: z.literal('bav'),
})

export const subjectIdParser = z.discriminatedUnion('idType', [ProductAndQuantity, Bav])
export type SubjectId = z.infer<typeof subjectIdParser>

const schemaBaseUrl = 'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging'
export const carbonRequestSchema = z.literal(`${schemaBaseUrl}/query_types/total_carbon_embodiment/request/0.1`)
export const carbonResponseSchema = z.literal(`${schemaBaseUrl}/query_types/total_carbon_embodiment/response/0.1`)
export const bavRequestSchema = z.literal(`${schemaBaseUrl}/query_types/beneficiary_account_validation/request/0.1`)
export const bavResponseSchema = z.literal(`${schemaBaseUrl}/query_types/beneficiary_account_validation/response/0.1`)

export const querySchema = z.union([carbonRequestSchema, carbonResponseSchema, bavRequestSchema, bavResponseSchema])
export type QuerySchema = z.infer<typeof querySchema>

export const schemaToTypeMap: Record<QuerySchema, QueryType> = {
  [carbonRequestSchema.value]: 'total_carbon_embodiment',
  [carbonResponseSchema.value]: 'total_carbon_embodiment',
  [bavRequestSchema.value]: 'beneficiary_account_validation',
  [bavResponseSchema.value]: 'beneficiary_account_validation',
}

export const responseSchema = z.union([carbonResponseSchema, bavResponseSchema])
export type ResponseSchema = z.infer<typeof responseSchema>
export const typeToResponseSchemaMap: Record<QueryType, ResponseSchema> = {
  total_carbon_embodiment: carbonResponseSchema.value,
  beneficiary_account_validation: bavResponseSchema.value,
} as const

const baseQueryRequest = {
  id: z.uuid(),
  createdTime: z.number().int().gte(0),
  expiresTime: z.number().int().gte(0),
}
export const carbonEmbodimentRequest = z.object({
  ...baseQueryRequest,
  type: carbonRequestSchema,
  data: z.object({
    subjectId: ProductAndQuantity,
  }),
})
export const bavRequest = z.object({
  ...baseQueryRequest,
  type: bavRequestSchema,
  data: z.object({
    subjectId: Bav,
  }),
})
export const submitQueryRpcParams = z.discriminatedUnion('type', [carbonEmbodimentRequest, bavRequest])
export type SubmitQueryRpcParams = z.infer<typeof submitQueryRpcParams>

export type SubmitQueryRequest = {
  method: 'submit_query_request'
  params: SubmitQueryRpcParams
}

const baseQueryResponse = z.object({
  id: z.uuid(),
  createdTime: z.number().int().gte(0).optional(),
  expiresTime: z.number().int().gte(0).optional(),
})

type BaseQueryResponse = z.infer<typeof baseQueryResponse>

export type CarbonEmbodimentRes = BaseQueryResponse & {
  type: z.infer<typeof carbonResponseSchema>
  data: {
    mass: number
    unit: 'ug' | 'mg' | 'g' | 'kg' | 'tonne'
    subjectId: SubjectId
    partialResponses: CarbonEmbodimentRes[]
  }
}
export const carbonEmbodimentResponseData: z.ZodType<CarbonEmbodimentRes['data']> = z.object({
  mass: z.number(),
  unit: z.enum(['ug', 'mg', 'g', 'kg', 'tonne']),
  subjectId: subjectIdParser,
  partialResponses: z.lazy(() => carbonEmbodimentResponse.array()),
})
export const carbonEmbodimentResponse = z.object({
  ...baseQueryResponse.shape,
  type: carbonResponseSchema,
  data: carbonEmbodimentResponseData,
})

export type BavRes = BaseQueryResponse & {
  type: z.infer<typeof bavResponseSchema>
  data: {
    subjectId: SubjectId
    bic: BIC
    countryCode: CountryCode
  }
}
export const bavResponseData: z.ZodType<BavRes['data']> = z.object({
  subjectId: subjectIdParser,
  bic: z.string(),
  countryCode: z.enum(countryCodes),
})
export const bavResponse = z.object({
  ...baseQueryResponse.shape,
  type: bavResponseSchema,
  data: bavResponseData,
})

export const submitQueryResponseRpcParams = z.discriminatedUnion('type', [carbonEmbodimentResponse, bavResponse])
export type SubmitQueryResponseRpcParams = z.infer<typeof submitQueryResponseRpcParams>

export type SubmitQueryResponse = {
  method: 'submit_query_response'
  params: SubmitQueryResponseRpcParams
}

export type DrpcQueryRequest = SubmitQueryRequest | SubmitQueryResponse

export const drpcQueryAck = z.object({
  type: z.literal(`${schemaBaseUrl}/query_ack/0.1`),
  createdTime: z.number().int().gte(0).optional(),
  expiresTime: z.number().int().gte(0).optional(),
})

export type DrpcQueryResponse = z.infer<typeof drpcQueryAck>
