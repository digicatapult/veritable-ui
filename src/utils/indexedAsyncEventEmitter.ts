import { EventEmitter, captureRejectionSymbol } from 'node:events'

import { type ILogger } from '../logger.js'
import TwoWayMap from '../utils/twoWayMap.js'

type IndexedAsyncEventEmitterOptions = {
  maxRetryCount: number
  retryTimeoutMs: number
  retryBackOffFactor: number
  retryExhaustedBehaviour: 'THROW' | 'IGNORE'
}

const defaultOptions: IndexedAsyncEventEmitterOptions = {
  maxRetryCount: 10,
  retryTimeoutMs: 500,
  retryBackOffFactor: 2,
  retryExhaustedBehaviour: 'THROW',
}

const eventIdentifierSymbol = Symbol('IndexedAsyncEventEmitter')
type IndexedEvent = { [eventIdentifierSymbol]: symbol }

/**
 * Event emitter that will retry events where handlers reject.
 * Events are indexed and will only be retried if a more recent event with the same index has not been emitted
 * Emitted events that aren't indexed will not be retried
 */
export default abstract class IndexedAsyncEventEmitter<
  K extends string,
  T extends Record<K, any>,
  I = string,
> extends EventEmitter<{
  [key in keyof T]: T[key][]
}> {
  private latestEventIdentifiers: { [key in keyof T]?: TwoWayMap<I, symbol> } = {}
  private retryCount = new WeakMap<symbol, number>()

  private options: IndexedAsyncEventEmitterOptions
  protected abstract logger: ILogger

  constructor(options?: Partial<IndexedAsyncEventEmitterOptions>) {
    super({ captureRejections: true })

    this.options = {
      ...defaultOptions,
      ...(options || {}),
    }
  }

  // handle if async handlers throw. Non indexed events will follow what's in `options.retryExhaustedBehaviour`
  [captureRejectionSymbol]<E>(err: Error, eventName: E | K, ...args: object[]) {
    this.logger.warn('Error processing %s event: %s', eventName, err.message)
    this.logger.debug('Error processing %s event: %o stack: %s', args[0], err.stack)

    const data = args[0]
    if (this.isIndexedEvent(data) && this.isTrackedEventName(eventName)) {
      const eventIdentifier = data[eventIdentifierSymbol]
      const retryCount = this.retryCount.get(eventIdentifier) ?? this.options.maxRetryCount
      const timeoutMs = this.options.retryTimeoutMs * Math.pow(this.options.retryBackOffFactor, retryCount)
      this.checkRetry(err, eventName, data)

      // trampoline and retry
      setTimeout(this.retryEmit.bind(this), timeoutMs, err, eventName, data)
      return
    }

    if (this.options.retryExhaustedBehaviour === 'THROW') {
      this.logger.fatal('Error processing %s event: %o stack: %s', args[0], err.stack)
      throw err
    }
  }

  /**
   * Emits an indexed event that can be retried if handlers reject. Event will only be retried if another event with the same index hasn't since been emitted.
   * @param eventName Name of the event to emit
   * @param index Indexing value that identified the resource that created this event
   * @param arg Value associated with the event
   * @returns Whether the event had handlers or not
   */
  public emitIndexed<E extends K>(eventName: E, index: I, arg: T[E]): boolean {
    const stateMap = this.latestEventIdentifiers[eventName] || new TwoWayMap()
    this.latestEventIdentifiers[eventName] = stateMap

    // if data is populated with the identifier symbol it must have previously been emitted.
    // clone the data so we don't mutate the ongoing event
    const distinctArg = this.isIndexedEvent(arg) ? { ...arg } : arg

    // generate a unique identifier for this emit
    const eventIdentifier = Symbol(`${eventName}-${index}`)
    const withIdentifier = Object.assign(distinctArg, { [eventIdentifierSymbol]: eventIdentifier })

    // record that this is the latest event for this index and set retry to 0
    this.retryCount.set(eventIdentifier, 0)
    stateMap.set(index, eventIdentifier)

    return this.emitIndexedInternal(eventName, withIdentifier)
  }

  private retryEmit(err: Error, eventName: K, data: T[K] & IndexedEvent) {
    // check if we should retry and if so get the current count
    const retry = this.checkRetry(err, eventName, data)
    if (retry === false) {
      return
    }

    // increment the retry count
    this.retryCount.set(data[eventIdentifierSymbol], retry + 1)

    this.emitIndexedInternal(eventName, data)
  }

  private emitIndexedInternal(eventName: K, data: T[K]): boolean {
    // this is extremely ugly but the typechecker finds it hard to realise the types are correct here
    const params = [eventName, data] as unknown as Parameters<typeof this.emit<K>>
    return this.emit<K>(...params)
  }

  private checkRetry<E>(err: Error, eventName: E, data: IndexedEvent) {
    // if the event isn't the latest event for some eventname we shouldn't retry
    const index = this.latestEventIdentifiers[eventName]?.getRev(data[eventIdentifierSymbol])
    if (index === undefined) {
      return false
    }

    // get the latest retry count. We need to provide some default in case it's not in the weak map so just make sure we don't retry if somehow that happens
    const retryCount = this.retryCount.get(data[eventIdentifierSymbol]) ?? this.options.maxRetryCount
    if (retryCount >= this.options.maxRetryCount) {
      this.logger.error('Recount limit exceeded for ConnectionStateChanged id=%s', index)
      if (this.options.retryExhaustedBehaviour === 'THROW') {
        throw err
      }
      return false
    }

    return retryCount
  }

  // note this assertion is logically flawed. We are checking that we have the symbol and the only way an object
  // can be created with that symbol is if it's valid, but some exotic coding could make this fail
  private isIndexedEvent(eventData: object): eventData is T[K] & IndexedEvent {
    return Object.hasOwn(eventData, eventIdentifierSymbol)
  }

  private isTrackedEventName<E>(eventName: E | K): eventName is K {
    if (typeof eventName === 'string' || typeof eventName === 'number' || typeof eventName === 'symbol')
      return Object.hasOwn(this.latestEventIdentifiers, eventName)

    return false
  }
}
