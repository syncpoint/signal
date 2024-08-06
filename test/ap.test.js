import assert from 'node:assert'
import { describe, it } from 'mocha'
import * as R from 'ramda'
import Signal from '../lib/index.js'

describe('Signal.ap', function () {
  it('ap :: Signal s => s (a -> b) -> s a -> s b', function () {
    const a = Signal.of()
    const fn = Signal.of(x => x + 1)
    const b = R.ap(fn, a)
    assert.strictEqual(b(), undefined)
    a(1); assert.strictEqual(b(), 2)
    fn(x => x * 3); assert.strictEqual(b(), 3)
    a(2); assert.strictEqual(b(), 6)
  })
})
