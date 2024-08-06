import assert from 'node:assert'
import { describe, it } from 'mocha'
import * as R from 'ramda'
import Signal from '../lib/index.js'

describe('Signal.options', function () {

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
