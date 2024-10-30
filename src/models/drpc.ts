import z from 'zod'

import { UUID } from './strings.js'

export const carbonEmbodimentRequestData = z.object({
  subjectId: z.string(),
  quantity: z.number().int().min(1),
})
export const carbonEmbodimentRequest = z.object({
  id: z.string(),
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
    // createdTime: number
    // expiresTime: number
  } & CarbonEmbodimentReq
}

export type CarbonEmbodimentRes = {
  id: string
  type: 'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_types/total_carbon_embodiment/response/0.1'
  data: {
    mass: number
    subjectId: string
    partialResponses: CarbonEmbodimentRes[]
  }
}
export const carbonEmbodimentResponseData: z.ZodType<CarbonEmbodimentRes['data']> = z.object({
  mass: z.number(),
  subjectId: z.string(),
  partialResponses: z.lazy(() => carbonEmbodimentResponse.array()),
})
export const carbonEmbodimentResponse: z.ZodType<CarbonEmbodimentRes> = z.object({
  id: z.string(),
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
    // createdTime: number
    // expiresTime: number
  } & CarbonEmbodimentRes
}

export type DrpcQueryRequest = SubmitQueryRequest | SubmitQueryResponse
