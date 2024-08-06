import assert from 'node:assert'
import { describe, it } from 'mocha'
import * as R from 'ramda'
import Signal from '../lib/index.js'

describe('Signal.tap', function () {
  it('tap :: Signal s => (a -> any) -> s a -> s a', function () {
    let actual = 0
    const a = Signal.of()
    const b = Signal.tap(a => (actual += a), a)
    R.range(0, 10).forEach(a)
    assert.strictEqual(actual, 45)
    assert.strictEqual(b(), 9)
  })
})