import assert from 'assert'
import { describe, it } from 'mocha'
import * as R from 'ramda'
import Signal from '../lib/index.js'

describe('algorithm', function () {

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

  describe('evaluate linked signal on construction', function () {

    // Eagerly evalute linked signal on construction;
    // no further processing.
    // a. all sources are defined: call production with source values
    // b. else: linked signal remains undefined

    it('one undefined source', function () {
      const a = Signal.of()
      const b = Signal.link(R.add(1), a)
      assert.strictEqual(b(), undefined)
    })

    it('one defined source', function () {
      const a = Signal.of(1)
      const b = Signal.link(R.add(2), a)
      assert.strictEqual(b(), 3)
    })

    it('two defined sources', function () {
      const a = Signal.of(1)
      const b = Signal.of(2)
      const c = Signal.link(R.add, [a, b])
      assert.strictEqual(c(), 3)
    })
  })

  describe('update simple value without sinks', function () {

    // Set value of simple signal without sinks;
    // no further processing without sinks.
    // a. new value is undefined: no-op (undefined is not a valid value)
    // b. new value equals current value (Object.is): no-op
    // c. else: update signal value to new value

    it('undefined value', function () {
      const a = Signal.of(1)
      a(undefined); assert.strictEqual(a(), 1)
    })

    it('same value (no observable side-effects)', function () {
      const a = Signal.of(1)
      a(1); assert.strictEqual(a(), 1)
    })

    it('different value', function () {
      const a = Signal.of(1)
      a(2); assert.strictEqual(a(), 2)
    })
  })

  it('update simple value with sinks (linear graph)', function () {
    const a = Signal.of(1)
    const b = Signal.link(R.add(1), a)
    const c = Signal.link(R.add(1), b)
    assert.strictEqual(c(), 3)
    a(2); assert.strictEqual(c(), 4)
  })

  it('update simple value with sinks (diamond)', function () {
    const a = Signal.of(1)
    const b = Signal.link(R.add(1), a)
    const c = Signal.link(R.add(2), a)
    const d = Signal.link((b, c) => b * c, [b, c])
    assert.strictEqual(d(), 6)
    a(2); assert.strictEqual(d(), 12)
  })
})
