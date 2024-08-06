import { expect } from 'chai'
import { describe, test } from 'mocha'

import { neverFail } from '../promises.js'

describe('promises', function () {
  describe('neverFail', function () {
    test('resolves', async function () {
      const result = await neverFail(Promise.resolve('test'))
      expect(result).to.equal('test')
    })

    test('rejects', async function () {
      let error: unknown = null
      try {
        await neverFail(Promise.reject('error'))
      } catch (err) {
        error = err
      }

      expect(error).to.equal(null)
    })
  })
})
