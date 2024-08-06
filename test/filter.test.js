import assert from 'node:assert'
import { describe, it } from 'mocha'
import * as R from 'ramda'
import Signal from '../lib/index.js'
import recorder from './_recorder.js'

describe('Signal.filter', function () {
  it('filter :: Signal s => (a -> boolean) -> s a -> s a', function () {
    const a = Signal.of()
    const b = R.filter(x => x % 2 === 0, a)
    const actual = recorder(b)
    ;[2, 3, 4].forEach(a)
    assert.deepStrictEqual(actual(), ['2', '4'])
  })
})
