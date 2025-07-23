import { BavResFields } from './drpc'

export const Bav = Symbol('Bav')

/**
 * Interface for Beneficiary Account Validation APIs
 **/
export interface IBav {
  validate(fields: BavResFields): Promise<{ score: number; description: string }>
}
