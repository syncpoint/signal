import assert from 'node:assert'
import { describe, it } from 'mocha'
import Signal from '../lib/index.js'

describe('Signal.equals', function () {
  it('[f9fd] equals :: Signal s => s a -> s b -> Boolean (reflexivity)', function () {
    const a = Signal.of(3)
    assert.strictEqual(a['fantasy-land/equals'](a), true)
  })

  it('[acad] equals :: Signal s => s a -> s b -> Boolean (symmetry)', function () {
    const a = Signal.of(3)
    const b = Signal.of(3)
    assert.strictEqual(a['fantasy-land/equals'](b), b['fantasy-land/equals'](a))
  })

  it('[50d0] equals :: Signal s => s a -> s b -> Boolean (symmetry)', function () {
    const a = Signal.of(2)
    const b = Signal.of(3)
    assert.strictEqual(a['fantasy-land/equals'](b), b['fantasy-land/equals'](a))
  })

  it('[8b7b] equals :: Signal s => s a -> s b -> Boolean (transitivity)', function () {
    const a = Signal.of(3)
    const b = Signal.of(3)
    const c = Signal.of(3)

    const actual = [
      a['fantasy-land/equals'](b),
      b['fantasy-land/equals'](c),
      a['fantasy-land/equals'](c)
    ]

    assert.deepStrictEqual(actual, [true, true, true])
  })
})
