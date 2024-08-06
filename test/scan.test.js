import assert from 'node:assert'
import { describe, it } from 'mocha'
import * as R from 'ramda'
import Signal from '../lib/index.js'

describe('Signal.scan', function () {
  it('scan :: Signal s => (b -> a -> b) -> b -> s a -> s b', function () {
    const a = Signal.of()
    const b = Signal.scan((acc, a) => acc + a, 0, a)
    R.range(0, 10).forEach(a)
    assert.strictEqual(b(), 45)
  })
})
