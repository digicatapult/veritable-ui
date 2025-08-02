import { DrpcRequest } from '../../veritableCloudagentEvents.js'

export const goodRequestId = '00000000-0000-4000-8000-000000000000'
export const goodResponseId = '00000000-0000-4000-8000-111111111111'
export const goodResponseChildId = '00000000-0000-4000-8000-222222222222'

export const parentConnectionId = '11111111-0000-4000-8000-000000000000'
export const childConnectionId = '22222222-0000-4000-8000-000000000000'
export const parentQueryId = '11111111-0000-4000-8000-111111111111'
export const childQueryId = '22222222-0000-4000-8000-222222222222'
export const parentResponseId = '11111111-1111-4000-8000-000000000000'

export const goodRequest: DrpcRequest = {
  id: goodRequestId,
  jsonrpc: '2.0',
  method: 'submit_query_request',
  params: {
    id: '00000000-0000-4000-8000-111111111111',
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
    id: parentQueryId,
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

export const childConnection = [{ id: childConnectionId }]
export const parentQuery = [
  {
    id: parentQueryId,
    type: 'total_carbon_embodiment',
    details: {
      subjectId: {
        idType: 'product_and_quantity',
        content: {
          productId: 'parent-product-id',
          quantity: 42,
        },
      },
    },
    response: {
      mass: 58,
      unit: 'kg',
    },
    status: 'forwarded',
    connection_id: parentConnectionId,
    response_id: parentResponseId,
  },
]

export const childQuery = [
  {
    id: childQueryId,
    response: null,
    parent_id: parentQueryId,
  },
]

export const allChildQuery = [
  {
    id: childQueryId,
    type: 'total_carbon_embodiment',
    response: {
      subjectId: {
        idType: 'product_and_quantity',
        content: {
          productId: 'child-product-id',
          quantity: 42,
        },
      },
      mass: 42,
      unit: 'kg',
      partialResponses: [],
    },
    parent_id: parentQueryId,
    status: 'resolved',
  },
]
