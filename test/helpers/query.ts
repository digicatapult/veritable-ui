import 'reflect-metadata'

import { fetchGet, fetchPost } from './routeHelper.js'
import { delay } from './util.js'

export const co2QueryContent = {
  productId: 'E2E-DC001',
  quantity: '100',
}

export async function withQueryRequest(requesterUrl: string) {
  const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89ab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/
  const connections = await fetchGet(`${requesterUrl}/connection`)
  const html = await connections.text()
  const [connectionId] = html.match(uuidRegex) || []
  if (!connectionId) {
    throw new Error(`Connection not found ${connectionId}`)
  }

  await fetchPost(`${requesterUrl}/queries/new/scope-3-carbon-consumption`, {
    connectionId,
    ...co2QueryContent,
  })
}

export async function withQueryResponse(requesterUrl: string, responderUrl: string, emissions?: number) {
  await withQueryRequest(requesterUrl)
  const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89ab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/
  const connections = await fetchGet(`${responderUrl}/connection`)
  const connectionsHtml = await connections.text()
  const [connectionId] = connectionsHtml.match(uuidRegex) || []
  if (!connectionId) {
    throw new Error(`Connection not found ${connectionId}`)
  }

  let retries = 30
  let queryId: string[] = ['']

  while (retries > 0) {
    await delay(500)
    const queriesRes = await fetchGet(`${responderUrl}/queries`)
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

  await fetchPost(`${responderUrl}/queries/scope-3-carbon-consumption/${queryId[0]}/response`, {
    companyId: connectionId,
    action: 'success',
    emissions: emissions || 999,
  })
}
