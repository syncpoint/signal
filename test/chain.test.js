import assert from 'node:assert'
import { describe, it } from 'mocha'
import * as R from 'ramda'
import Signal from '../lib/index.js'
import recorder from './_recorder.js'

describe('Signal.chain', function () {
  it('[3646] chain :: Signal s => (a -> s b) -> s a -> s b', async function () {
    const input = Signal.of()
    const output = input.chain(() => R.tap(s => [42].forEach(s), Signal.of()))
    const actual = recorder(output)
    input('go!'); assert.deepStrictEqual(actual(), ['42'])
  })

  it('[4ae4] chain :: Signal s => (a -> s b) -> s a -> s b', async function () {
    const expected = 42
    const main = Signal.of(expected)
    const output = main.chain(v => Signal.of(v))
    assert.deepStrictEqual(output(), expected)
  })

  it('[9cc4] chain :: Signal s => (a -> s b) -> s a -> s b', async function () {
    // Preserve ordering.
    const input = Signal.of()
    const a = Signal.of()
    const b = Signal.of()
    const c = Signal.of()
    const output = input.chain(R.identity)

    const actual = await new Promise(resolve => {
      const acc = []
      const push = x => acc.push(x)
      Signal.link(push, output)

      const ticks = [
        () => input(a), () => a(1), () => a(2), () => a(3),
        () => input(b), () => b(4), () => b(5), () => b(6),
        () => input(c), () => c(7), () => c(8), () => c(9),
        () => input(null)
      ]

      const timer = setInterval(() => {
        if (ticks.length) return ticks.shift()()
        clearInterval(timer)
        resolve(acc)
      }, 0)
    })

    const expected = R.range(1, 10)
    assert.deepStrictEqual(actual, expected)
  })
})
