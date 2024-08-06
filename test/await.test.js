import assert from 'node:assert'
import { describe, it } from 'mocha'
import Signal from '../lib/index.js'

describe('Signal.await', function () {

  it('[701f] await :: Signal s => s Promise a -> s a', function () {
    const a = Signal.of(Promise.resolve(1))
    const b = Signal.await(a)
    setImmediate(() => assert.strictEqual(b(), 1))
  })

  it('[af80] await :: Signal s => s Promise a -> s a', function () {
    const a = Signal.of(1)
    const b = a.map(async a => (await a) + 1)
    const c = Signal.await(b)
    setImmediate(() => assert.strictEqual(c(), 2))
  })
})
