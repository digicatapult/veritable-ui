import { Logger } from 'pino'
import { BavResFields } from './drpc'

export const Bav = Symbol('Bav')

/**
 * Interface for Beneficiary Account Validation APIs
 **/
export interface IBav {
  validate(logger: Logger, fields: BavResFields): Promise<{ score: number; description: string }>
}
