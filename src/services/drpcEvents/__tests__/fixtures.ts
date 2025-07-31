import { DrpcRequest } from '../../veritableCloudagentEvents.js'

export const goodRequest: DrpcRequest = {
  id: '00000000-0000-0000-0000-a2f8feb52944',
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
  id: '10000000-0000-0000-0000-a2f8feb52944',
  jsonrpc: '2.0',
  method: 'submit_query_response',
  params: {
    id: 'query-id',
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
  id: '20000000-0000-0000-0000-a2f8feb52944',
  jsonrpc: '2.0',
  method: 'submit_query_response',
  params: {
    id: 'child-query-id',
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
