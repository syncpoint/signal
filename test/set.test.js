import assert from 'node:assert'
import { describe, it } from 'mocha'
import Signal from '../lib/index.js'

describe('Signal.set', function () {
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

  ;[
    ['475c/448c', undefined, null],
    ['475c/b52f', undefined, 1],
    ['475c/d329', null, 1],
    ['475c/44e8', 1, null],
    ['475c/9f4a', 1, 2]
  ].forEach(([id, a, b]) => {
    it(`[${id}] set :: Signal s => ${a} -> ${b} -> s ${b}`, function () {
      const s = Signal.of(a)
      s(b)
      assert.strictEqual(s(), b)
    })
  })

  it('[b420] set :: Signal s => () -> s', function() {
    const expected = Signal.of()
    const actual = expected(23)
    assert.strictEqual(actual, expected)
  });
})