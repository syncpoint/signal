import assert from 'node:assert'
import { describe, it } from 'mocha'
import Signal from '../lib/index.js'

describe('Signal.startWith', function () {
  it('[ae26] startWith :: Signal s => a -> s a -> s a', function () {
    // Initial value if signal is undefined.
    const a = Signal.of()
    const b = Signal.startWith(0, a)
    assert.strictEqual(b(), 0)
    a(1); assert.strictEqual(b(), 1)
  })

  it('[46de] startWith :: Signal s => (() -> a) -> s a -> s a', function () {
    // Initial value (from function) if signal is undefined.
    const a = Signal.of()
    const b = Signal.startWith(() => 0, a)
    assert.strictEqual(b(), 0)
    a(1); assert.strictEqual(b(), 1)
  })

  it('[46de] startWith :: Signal s => a -> s a -> s a', function () {
    // Initial value for linked signal.
    const a = Signal.of()
    const b = Signal.link(a => a + 1, [a])
    const c = Signal.startWith(0, b)
    assert.strictEqual(c(), 0)
    a(1); assert.strictEqual(c(), 2)
  })

  it('[b308] startWith :: Signal s => a -> s a -> s a', function () {
    // Initial value is ignored if signal is defined.
    const a = Signal.of(1)
    const b = Signal.startWith(0, a)
    assert.strictEqual(b(), 1)
    a(2); assert.strictEqual(b(), 2)
  })
})