import assert from 'assert'
import { describe, it } from 'mocha'
import * as R from 'ramda'
import Signal from '../lib/index.js'

describe('transducer [Ramda]', function () {
  it('map', function () {
    const xf = R.map(R.multiply(2))
    const a = Signal.of()
    const b = Signal.transduce(xf, a)
    const c = Signal.scan(R.flip(R.append), [], b)
    ;[1, 2, 4].map(a)
    assert.deepStrictEqual(c(), [2, 4, 8])
  })

  it('drop', function () {
    const xf = R.drop(3)
    const a = Signal.of()
    const b = Signal.transduce(xf, a)
    const c = Signal.scan(R.flip(R.append), [], b)
    R.range(1, 7).map(a)
    assert.deepStrictEqual(c(), [4, 5, 6])
  })

  it('compose', function () {
    // Note: compose in context of transduce is
    // evaluated left to right!
    const xf = R.compose(
      R.map(R.add(-1)),
      R.filter(x => x % 2 === 0),
      R.map(R.multiply(3))
    )

    const a = Signal.of()
    const b = Signal.transduce(xf, a)
    const c = Signal.scan(R.flip(R.append), [], b)
    ;[4, 1, -3, 8, 7].map(a)
    assert.deepStrictEqual(c(), [0, -12, 18])
  })
})
