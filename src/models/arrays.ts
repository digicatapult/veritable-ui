import { UInt } from './numbers.js'
import { UUID } from './stringTypes.js'

export type PartialQuery = { connectionId: UUID; productId: string; quantity: number }
export type PartialQueryPayload = {
  connectionIds?: UUID[]
  productIds?: string[]
  quantities?: UInt[]
}
