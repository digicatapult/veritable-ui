export type PartialQuery = { connectionId: string; productId: string; quantity: number }
export type PartialQueryPayload = {
  connectionIds?: string[]
  productIds?: string[]
  quantities?: string[]
}
