import { UInt } from './numbers.js'
import { UUID } from './strings.js'

export type PartialQuery = { connectionId: UUID; productId: string; quantity: number }
export type PartialQueryPayload = {
  connectionIds?: UUID[]
  productIds?: string[]
  quantities?: UInt[]
}
