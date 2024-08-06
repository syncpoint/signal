import assert from 'node:assert'
import * as R from 'ramda'
import { describe, it } from "mocha";
import Signal from '../lib/index.js'
import hasValue from './_hasValue.js'

describe('Signal.of', function () {
  it('simple signal without value', function () {

    // Create signal without value; no further processing.

    const a = Signal.of()
    assert.strictEqual(a(), undefined)
  })

  it('simple signal with value', function () {

    // Create signal with value; no further processing.

    const a = Signal.of(1)
    assert.strictEqual(a(), 1)
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
  })

  describe('"label" option', function () {
    it('of', function () {
      const a = Signal.of(0, { label: 'a' })
      assert.deepStrictEqual(a.__label, 'a')
    })
  })

  ;[
    ['null', null],
    ['number', 0, 42],
    ['string', '', 'x'],
    ['boolean', false, true],
    ['function', () => {}, x => x],
    ['object', {}, { key: 'value ' }]
  ].forEach(([type, ...values]) => {
    // Create signal from value other than undefined.
    it(`of :: Signal s, v ${type} => v -> s v`, function () {
      values.forEach(value => {
        assert(hasValue(Signal.of(value), value))
      })
    })
  })

  it('of :: Signal s, v undefined => v -> s v', function () {
    // Value of undefined signal is `undefined`.
    const s = Signal.of(undefined)
    assert.strictEqual(s(), undefined)
  })

  ;[
    ['d25b/4edd', 'null', null],
    ['d25b/846d', 'number', 0],
    ['d25b/e268', 'string', 'x'],
    ['d25b/4c73', 'boolean', true],
    ['d25b/9bd6', 'function', x => x],
    ['d25b/56a9', 'object', { key: 'value ' }]
  ].forEach(([id, label, v]) => {
    // Updating signal with undefined is a no-op.
    it(`[${id}] set :: Signal s => ${label} -> undefined -> s ${label}`, function () {
      const s = Signal.of(v)
      s(undefined)
      assert.strictEqual(s(), v)
    })
  })
})
