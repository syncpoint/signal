import assert from 'node:assert'
import * as R from 'ramda'
import { describe, it } from 'mocha'
import Signal from '../lib/index.js'

describe('Signal.map', function () {
  it('Signal should only update on changed value', function () {
    let called = 0
    const a = Signal.of()
    a.map(a => { called += 1; return a + 1 })
    assert.strictEqual(called, 0)
    a(1); assert.strictEqual(called, 1)
    a(1); assert.strictEqual(called, 1)
  })

  it('[2d75] map :: Signal s => (a -> b) -> s a -> s b', function () {
    const a = Signal.of()
    const b = R.map(x => x * 2, a)
    assert.strictEqual(b(), undefined)
    a(1); assert.strictEqual(b(), 2)
    a(2); assert.strictEqual(b(), 4)
  })

  it('[af73] map :: Signal s => (a -> b) -> s a -> s b', function () {
    const a = Signal.of(1)
      .map(x => x * 2)
      .map(x => x + 1)

    assert.strictEqual(a(), 3)
  })
})
