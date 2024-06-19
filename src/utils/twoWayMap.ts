export default class TwoWayMap<K, V> {
  private forwardMap: Map<K, V>
  private reverseMap: Map<V, K>

  constructor(items?: [K, V][]) {
    this.forwardMap = new Map(items)

    this.reverseMap = new Map()
    for (const [k, v] of this.forwardMap) {
      this.reverseMap.set(v, k)
    }
  }

  set(key: K, value: V) {
    if (this.reverseMap.has(value)) {
      throw new Error('Value already set')
    }

    this.delete(key)
    this.forwardMap.set(key, value)
    this.reverseMap.set(value, key)
  }

  setRev(value: V, key: K) {
    if (this.forwardMap.has(key)) {
      throw new Error('Key already set')
    }

    this.deleteRev(value)
    this.forwardMap.set(key, value)
    this.reverseMap.set(value, key)
  }

  delete(key: K) {
    const value = this.forwardMap.get(key)
    if (value) {
      this.forwardMap.delete(key)
      this.reverseMap.delete(value)
    }
  }

  deleteRev(value: V) {
    const key = this.reverseMap.get(value)
    if (key) {
      this.forwardMap.delete(key)
      this.reverseMap.delete(value)
    }
  }

  get(key: K) {
    return this.forwardMap.get(key)
  }

  getRev(value: V) {
    return this.reverseMap.get(value)
  }

  has(key: K) {
    return this.forwardMap.has(key)
  }

  hasRev(value: V) {
    return this.reverseMap.has(value)
  }
}
