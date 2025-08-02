import 'reflect-metadata'

import { CountryCode } from '../../src/models/strings.js'
import { fetchGet, fetchPost } from './routeHelper.js'
import { delay } from './util.js'

export const co2QueryContent = {
  productId: 'E2E-DC001',
  quantity: '100',
}

const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89ab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/

export async function withCarbonQueryRequest(requesterUrl: string) {
  const connectionId = await getConnectionId(requesterUrl)

  await fetchPost(`${requesterUrl}/queries/carbon-embodiment`, {
    connectionId,
    ...co2QueryContent,
  })
}

export async function withBavQueryRequest(requesterUrl: string) {
  const connectionId = await getConnectionId(requesterUrl)

  await fetchPost(`${requesterUrl}/queries/bav`, {
    connectionId,
  })
}

export async function withCarbonQueryResponse(requesterUrl: string, responderUrl: string, emissions?: number) {
  await withCarbonQueryRequest(requesterUrl)
  const connectionId = await getConnectionId(responderUrl)
  const queryId = await getQuery(responderUrl)

  await fetchPost(`${responderUrl}/queries/${queryId}/response/carbon-embodiment`, {
    companyId: connectionId,
    emissions: emissions || 999,
  })
}

export async function withBavQueryResponse(
  requesterUrl: string,
  responderUrl: string,
  bic: string,
  countryCode: CountryCode
) {
  await withBavQueryRequest(requesterUrl)
  const connectionId = await getConnectionId(responderUrl)
  const queryId = await getQuery(responderUrl)

  await fetchPost(`${responderUrl}/queries/${queryId}/response/bav`, {
    companyId: connectionId,
    bic,
    countryCode,
  })
}

async function getConnectionId(baseUrl: string) {
  const connections = await fetchGet(`${baseUrl}/connection`)
  const connectionsHtml = await connections.text()
  const [connectionId] = connectionsHtml.match(uuidRegex) || []
  if (!connectionId) {
    throw new Error(`Connection not found ${connectionId}`)
  }
  return connectionId
}

async function getQuery(baseUrl: string) {
  let retries = 30
  let queryId: string[] = ['']

  while (retries > 0) {
    await delay(500)
    const queriesRes = await fetchGet(`${baseUrl}/queries`)
    const queriesHtml = await queriesRes.text()
    const [queryStatus] = queriesHtml.match(/Respond to query/g) || []
    queryId = queriesHtml.match(uuidRegex) || []

    if (queryStatus) {
      retries = 0
    } else if (retries === 1) {
      throw new Error('timeout retrieving query')
    } else {
      retries--
    }
  }
  return queryId[0]
}
