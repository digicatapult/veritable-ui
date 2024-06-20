import { pino } from 'pino'

import { ILogger } from '../../../logger.js'
import IndexedAsyncEventEmitter from '../../indexedAsyncEventEmitter.js'

const mockLogger = pino({ level: 'silent' })

export type EventNames = 'A' | 'B' | 'C'
export type EventData = {
  A: { dataA: string }
  B: { dataB: string }
  C: { dataA: string }
}

export class TestIndexedAsyncEventEmitter extends IndexedAsyncEventEmitter<EventNames, EventData> {
  protected logger: ILogger = mockLogger
}

export const eventA = (value: string = 'test') => ({
  dataA: value,
})
export const eventB = (value: string = 'test') => ({
  dataB: value,
})
