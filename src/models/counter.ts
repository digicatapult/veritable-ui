import { singleton } from 'tsyringe'

@singleton()
export default class Counter {
  private counter: number = 0

  constructor() {}

  get(): number {
    return this.counter
  }

  increment(): number {
    this.counter = this.counter + 1
    return this.counter
  }
}
