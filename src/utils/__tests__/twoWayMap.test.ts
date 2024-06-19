import { expect } from 'chai'
import { describe, it } from 'mocha'

import TwoWayMap from '../twoWayMap.js'

describe('twoWayMap', function () {
  describe('ctor', function () {
    it('should initialise map with keys', function () {
      const map = new TwoWayMap([
        ['a', 1],
        ['b', 2],
      ])
      expect(map.get('a')).equal(1)
      expect(map.get('b')).equal(2)
    })

    it('should initialise map with values', function () {
      const map = new TwoWayMap([
        ['a', 1],
        ['b', 2],
      ])
      expect(map.getRev(1)).equal('a')
      expect(map.getRev(2)).equal('b')
    })
  })

  describe('set', function () {
    it('should set the key to provided value', function () {
      const map = new TwoWayMap()
      map.set('a', 1)

      expect(map.get('a')).to.equal(1)
    })

    it('should set the value to provided key', function () {
      const map = new TwoWayMap()
      map.set('a', 1)

      expect(map.getRev(1)).to.equal('a')
    })

    it('should override already initialised value', function () {
      const map = new TwoWayMap([['a', 1]])
      map.set('a', 2)

      expect(map.get('a')).to.equal(2)
    })

    it('should set value with already initialised value', function () {
      const map = new TwoWayMap([['a', 1]])
      map.set('a', 2)

      expect(map.getRev(2)).to.equal('a')
    })

    it('should remove old value when key is changed', function () {
      const map = new TwoWayMap([['a', 1]])
      map.set('a', 2)

      expect(map.getRev(1)).to.equal(undefined)
    })
  })

  describe('setRev', function () {
    it('should set the value to provided key', function () {
      const map = new TwoWayMap()
      map.setRev(1, 'a')

      expect(map.get('a')).to.equal(1)
    })

    it('should set the key to provided value', function () {
      const map = new TwoWayMap()
      map.setRev(1, 'a')

      expect(map.getRev(1)).to.equal('a')
    })

    it('should override already initialised value', function () {
      const map = new TwoWayMap([['a', 1]])
      map.setRev(1, 'b')

      expect(map.getRev(1)).to.equal('b')
    })

    it('should set key with already initialised key', function () {
      const map = new TwoWayMap([['a', 1]])
      map.setRev(1, 'b')

      expect(map.get('b')).to.equal(1)
    })

    it('should remove old key when value is changed', function () {
      const map = new TwoWayMap([['a', 1]])
      map.setRev(1, 'b')

      expect(map.get('a')).to.equal(undefined)
    })
  })

  describe('delete', function () {
    it('should remove provided key', function () {
      const map = new TwoWayMap([['a', 1]])
      map.delete('a')

      expect(map.get('a')).to.equal(undefined)
    })

    it('should remove associated value', function () {
      const map = new TwoWayMap([['a', 1]])
      map.delete('a')

      expect(map.getRev(1)).to.equal(undefined)
    })

    it('should leave key unset if not exts', function () {
      const map = new TwoWayMap()
      map.delete('a')

      expect(map.get('a')).to.equal(undefined)
    })

    it('should leave value unset if not exts', function () {
      const map = new TwoWayMap()
      map.delete('a')

      expect(map.getRev(1)).to.equal(undefined)
    })
  })

  describe('deleteRev', function () {
    it('should remove provided value', function () {
      const map = new TwoWayMap([['a', 1]])
      map.deleteRev(1)

      expect(map.getRev(1)).to.equal(undefined)
    })

    it('should remove associated key', function () {
      const map = new TwoWayMap([['a', 1]])
      map.deleteRev(1)

      expect(map.get('a')).to.equal(undefined)
    })

    it('should leave value unset if not exts', function () {
      const map = new TwoWayMap()
      map.delete(1)

      expect(map.getRev(1)).to.equal(undefined)
    })

    it('should leave key unset if not exts', function () {
      const map = new TwoWayMap()
      map.deleteRev(1)

      expect(map.get('a')).to.equal(undefined)
    })
  })
})
