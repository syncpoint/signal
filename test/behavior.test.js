import assert from 'node:assert'
import { setImmediate } from 'node:timers'
import { describe, it } from 'mocha'
import * as R from 'ramda'
import Signal from '../lib/index.js'

describe('Behavior', function () {
  it('Signal should only update on changed value', function () {
    let called = 0
    const a = Signal.of()
    a.map(a => { called += 1; return a + 1 })
    assert.strictEqual(called, 0)
    a(1); assert.strictEqual(called, 1)
    a(1); assert.strictEqual(called, 1)
  })

  it('Effect (direct) should only be called on changed value', function () {
    let called = 0
    const a = Signal.of()
    a.on(() => (called += 1))
    assert.strictEqual(called, 0)
    a(1); assert.strictEqual(called, 1)
    a(1); assert.strictEqual(called, 1)
  })

  it('Effect (indirect) should only be called on changed value', function () {
    let called = 0
    const a = Signal.of()
    const b = a.map(a => a % 2)
    b.on(() => (called += 1))
    a(2); assert.strictEqual(called, 1)
    a(4); assert.strictEqual(called, 1)
  })

  describe('"equals" option', function () {
    it('of (modulo)', function () {
      const a = Signal.of(0, { equals: (a, b) => (a % 2) === (b % 2) })
      const b = Signal.scan(R.flip(R.append), [], a)
      ;[5, 3, 10, 0].map(a)
      assert.deepStrictEqual(b(), [0, 5, 10])
    })

    it('of (distance)', function () {
      // Consider to consecutive values as equal when their
      // abolute difference (distance) is smaller than epsilon.
      const epsilon = 0.2
      const a = Signal.of(0, { equals: (a, b) => Math.abs(a - b) < epsilon })
      const b =  Signal.scan(R.flip(R.append), [], a)
      ;[4, 4.1, 4.15, 4.5].map(a)
      assert.deepStrictEqual(b(), [0, 4, 4.5])
    })

    it('link', function () {
      // Consider two consecutive strings to be equal when their
      // absolute difference in length is smaller than delta.
      const delta = 4
      const equals = (a, b) => Math.abs(a.length - b.length ) < delta
      const a = Signal.of('A')
      const b = Signal.of('B')
      const c = Signal.link(R.concat, [a, b], { equals })
      a('AA'); assert.strictEqual(c(), 'AB')
      b('BBBB') ; assert.strictEqual(c(), 'AABBBB')
      b('BB') ; assert.strictEqual(c(), 'AABBBB')
      a(''); assert.strictEqual(c(), 'BB')
    })

    it('deferred', function () {
      const a = Signal.deferred(() => Promise.resolve(1), { equals: R.F })
      const b = Signal.scan(R.flip(R.append), [], a)
      setImmediate(() => {
        R.range(0, 4).forEach(() => a(1))
        assert.deepStrictEqual(b(), [1, 1, 1, 1, 1])
      })
    })
  })

  describe('"label" option', function () {
    it('of', function () {
      const a = Signal.of(0, { label: 'a' })
      assert.deepStrictEqual(a.__label, 'a')
    })

    it('link', function () {
      const a = Signal.of()
      const b = Signal.link(a => a + 1, [a], { label: 'b' })
      assert.deepStrictEqual(b.__label, 'b')
    })
  })

  describe('options', function () {
    it('options :: Signal s => s -> {k: v} -> s', function () {
      const a = Signal.of(1)
      const b = a.map(R.modulo(2))
      const expected = { equals: R.F, label: 'b' }
      Signal.options(b, expected)
      assert.strictEqual(b.__equals, R.F)
      assert.strictEqual(b.__label, 'b')
    })

    it('options :: Signal s => s -> {k: v} -> s', function () {
      const a = Signal.of(1)
      const b = a.map(R.modulo(2))
      const expected = { equals: R.F, label: 'b' }
      Signal.options(b, expected)
      const actual = Signal.options(b)
      assert.deepStrictEqual(actual, expected)
    })

    it('options :: [undefined signature]', function () {
      const a = Signal.of(1)
      const b = a.map(R.modulo(2))
      const expected = { equals: R.F, label: 'b' }
      const actual = Signal.options(b, expected, 'invalid')
      assert.equal(actual, b)
    })
  })
})
