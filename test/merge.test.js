import assert from 'node:assert'
import { describe, it } from 'mocha'
import * as R from 'ramda'
import Signal from '../lib/index.js'

describe('Signal.merge', function () {
  it('merge :: Signal s => s a -> s b -> s (a | b)', function () {
    const a = Signal.of()
    const b = Signal.of()
    const c = Signal.merge(a, b)
    const d = Signal.scan(R.flip(R.append), [], c)
    assert.strictEqual(d(), undefined)

    a(1); b('2'); b('3'); a(4); b('5')
    assert.deepStrictEqual(d(), [1, '2', '3', 4, '5'])
  })
})