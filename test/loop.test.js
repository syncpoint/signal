import assert from 'node:assert'
import { describe, it } from 'mocha'
import * as R from 'ramda'
import Signal from '../lib/index.js'

describe('Signal.loop', function () {
  it('loop :: Signal s => (b -> a -> [b, c]) -> b -> s a -> s c', function () {
    const average = xs => xs.reduce((a, b) => a + b) / xs.length
    const a = Signal.of()
    const b = Signal.loop((xs, x) => {
      xs.push(x); xs = xs.slice(-10)
      return [xs, average(xs)]
    }, [], a)
    R.range(0, 20).forEach(a)
    assert.strictEqual(b(), 14.5) // sum(10..19) / 10
  })
})