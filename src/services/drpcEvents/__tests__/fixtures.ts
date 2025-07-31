import { DrpcRequest } from '../../veritableCloudagentEvents.js'

export const connectionId = '00000000-0000-0000-0000-000000000000'
export const agentConnectionId = '00000000-0000-0000-0000-000000000001'
export const queryId = '00000000-0000-0000-0000-000000000002'
export const childQueryId = '00000000-0000-0000-0000-000000000003'
export const drpcId = '00000000-0000-0000-0000-000000000004'

export const goodRequestId = '00000000-0000-0000-0000-100000000000'
export const goodResponseId = '00000000-0000-0000-0000-100000000001'
export const goodResponseChildId = '00000000-0000-0000-0000-100000000002'

export const goodRequest: DrpcRequest = {
  id: goodRequestId,
  jsonrpc: '2.0',
  method: 'submit_query_request',
  params: {
    id: 'fb45f64a-7c2b-43e8-85c2-da66a6899446',
    data: {
      subjectId: {
        idType: 'product_and_quantity',
        content: { productId: 'product-id', quantity: 42 },
      },
    },
    type: 'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_types/total_carbon_embodiment/request/0.1',
    createdTime: 0,
    expiresTime: 1,
  },
}

export const goodResponse: DrpcRequest = {
  id: goodResponseId,
  jsonrpc: '2.0',
  method: 'submit_query_response',
  params: {
    id: queryId,
    type: 'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_types/total_carbon_embodiment/response/0.1',
    data: {
      mass: 3456,
      unit: 'kg',
      subjectId: {
        idType: 'product_and_quantity',
        content: { productId: 'product-id', quantity: 42 },
      },
      partialResponses: [],
    },
  },
}

export const goodResponseChild = {
  id: goodResponseChildId,
  jsonrpc: '2.0',
  method: 'submit_query_response',
  params: {
    id: childQueryId,
    type: 'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_types/total_carbon_embodiment/response/0.1',
    data: {
      mass: 200,
      unit: 'kg',
      subjectId: {
        idType: 'product_and_quantity',
        content: { productId: 'partial-product-id', quantity: 42 },
      },
      partialResponses: [],
    },
  },
}
