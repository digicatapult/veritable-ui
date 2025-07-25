import { UUID } from 'crypto'
import { UInt } from './numbers.js'

export type PartialQuery = { connectionId: string; productId: string; quantity: number }
export type PartialQueryPayload = {
  connectionIds?: UUID[]
  productIds?: string[]
  quantities?: UInt[]
}
