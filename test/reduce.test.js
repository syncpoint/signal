import assert from 'node:assert'
import * as R from 'ramda'
import { describe, it } from 'mocha'
import Signal from '../lib/index.js'

describe('Signal.reduce', function () {
  it('[bdf8] reduce :: Signal s => (a -> b -> a) -> a -> s a', function () {
    const fn = (n, c) => {
      switch (c) {
        case 'inc': return n + 1
        case 'dec': return n - 1
        default: return n
      }
    }

    const s = Signal.reduce(fn, 0)
    const actual = Signal.scan(R.flip(R.append), [], s)
    s('inc'); s('inc'); s('inc'); s('dec'), s('noop')
    assert.strictEqual(s(), 2)
    assert.deepStrictEqual(actual(), [0, 1, 2, 3, 2])
  })
})
