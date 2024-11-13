import 'reflect-metadata'

import { fetchGet, fetchPost } from '../../helpers/routeHelper.js'

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
