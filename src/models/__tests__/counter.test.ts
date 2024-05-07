import { describe, it } from 'mocha'

import Counter from '../counter'

describe('Counter', async () => {
  let { expect } = await import('chai')

  describe('get', () => {
    it('should return counter state 0 initially', async () => {
      const counter = new Counter()
      const result = counter.get()
      expect(result).to.equal(0)
    })

    it('should return counter state 1 after incrementing', async () => {
      const counter = new Counter()
      counter.increment()
      const result = counter.get()
      expect(result).to.equal(1)
    })

    it('should return counter state 2 after incrementing twice', async () => {
      const counter = new Counter()
      counter.increment()
      counter.increment()
      const result = counter.get()
      expect(result).to.equal(2)
    })
  })
})
