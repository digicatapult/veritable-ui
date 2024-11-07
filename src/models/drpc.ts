import z from 'zod'

import { UUID } from './strings.js'

const subjectIdParser = z.discriminatedUnion('idType', [
  z.object({
    idType: z.literal('product_and_quantity'),
    content: z.object({
      productId: z.string(),
      quantity: z.number().int().gte(1),
    }),
  }),
])
type SubjectId = z.infer<typeof subjectIdParser>

export const carbonEmbodimentRequestData = z.object({
  subjectId: subjectIdParser,
})
export const carbonEmbodimentRequest = z.object({
  id: z.string(),
  createdTime: z.number().int().gte(0),
  expiresTime: z.number().int().gte(0),
  type: z.literal(
    'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_types/total_carbon_embodiment/request/0.1'
  ),
  data: carbonEmbodimentRequestData,
})
export const submitQueryRpcParams = z.discriminatedUnion('type', [carbonEmbodimentRequest])
export type SubmitQueryRpcParams = z.infer<typeof submitQueryRpcParams>

export type CarbonEmbodimentReqData = z.infer<typeof carbonEmbodimentRequestData>

export type CarbonEmbodimentReq = z.infer<typeof carbonEmbodimentRequest>
export type SubmitQueryRequest = {
  method: 'submit_query_request'
  params: {
    id: UUID
    createdTime: number
    expiresTime: number
  } & CarbonEmbodimentReq
}

export type CarbonEmbodimentRes = {
  id: string
  type: 'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_types/total_carbon_embodiment/response/0.1'
  createdTime?: number
  expiresAt?: number
  data: {
    mass: number
    unit: 'ug' | 'mg' | 'g' | 'kg' | 'tonne'
    subjectId: SubjectId
    partialResponses: CarbonEmbodimentRes[]
  }
}
export const carbonEmbodimentResponseData: z.ZodType<CarbonEmbodimentRes['data']> = z.object({
  mass: z.number(),
  unit: z.union([z.literal('ug'), z.literal('mg'), z.literal('g'), z.literal('kg'), z.literal('tonne')]),
  subjectId: subjectIdParser,
  partialResponses: z.lazy(() => carbonEmbodimentResponse.array()),
})
export const carbonEmbodimentResponse: z.ZodType<CarbonEmbodimentRes> = z.object({
  id: z.string(),
  createdTime: z.number().int().gte(0).optional(),
  expiresAt: z.number().int().gte(0).optional(),
  type: z.literal(
    'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_types/total_carbon_embodiment/response/0.1'
  ),
  data: carbonEmbodimentResponseData,
})

export const submitQueryResponseRpcParams = carbonEmbodimentResponse
export type SubmitQueryResponseRpcParams = z.infer<typeof submitQueryResponseRpcParams>

export type SubmitQueryResponse = {
  method: 'submit_query_response'
  params: {
    id: UUID
    createdTime?: number
    expiresTime?: number
  } & CarbonEmbodimentRes
}

export type DrpcQueryRequest = SubmitQueryRequest | SubmitQueryResponse

export const drpcQueryAck = z.object({
  type: z.literal(
    'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_ack/0.1'
  ),
  createdTime: z.number().int().gte(0).optional(),
  expiresTime: z.number().int().gte(0).optional(),
})

export type DrpcQueryResponse = z.infer<typeof drpcQueryAck>
