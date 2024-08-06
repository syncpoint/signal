import assert from 'node:assert'
import { describe, it } from 'mocha'
import Signal from '../lib/index.js'

describe('Signal.lte', function () {
  it('[6e3a] lte :: Signal s => s a -> s b -> Boolean (totality)', function () {
    const a = Signal.of(3)
    const b = Signal.of(4)
    assert(a['fantasy-land/lte'](b) || b['fantasy-land/lte'](a))
  })

  it('[6e3a] lte :: Signal s => s a -> s b -> Boolean (totality)', function () {
    const a = Signal.of(4)
    const b = Signal.of(3)
    assert(a['fantasy-land/lte'](b) || b['fantasy-land/lte'](a))
  })

  it('[6e3a] lte :: Signal s => s a -> s b -> Boolean (antisymmetry)', function () {
    const a = Signal.of(3)
    const b = Signal.of(3)

    const actual = [
      a['fantasy-land/lte'](b),
      b['fantasy-land/lte'](a),
      a['fantasy-land/equals'](b)
    ]

    assert.deepStrictEqual(actual, [true, true, true])
  })

  it('[722c] lte :: Signal s => s a -> s b -> Boolean (transitivity)', function () {
    const a = Signal.of(1)
    const b = Signal.of(2)
    const c = Signal.of(3)

    const actual = [
      a['fantasy-land/lte'](b),
      b['fantasy-land/lte'](c),
      a['fantasy-land/lte'](c)
    ]

    assert.deepStrictEqual(actual, [true, true, true])
  })
})
