import assert from 'node:assert'
import { describe, it } from 'mocha'
import Signal from '../lib/index.js'

describe('Signal.lift', function () {
  it('lift :: Signal s => ((a -> b -> ...) -> x) -> s a -> s b -> ... -> s x', function () {
    const a = Signal.of()
    const b = Signal.of()
    const c = Signal.lift((a, b) => a + b, a, b)
    a(1); b(2); assert.strictEqual(c(), 3)
    a(3); assert.strictEqual(c(), 5)
    b(1); assert.strictEqual(c(), 4)
  })
})
