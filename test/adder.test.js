import assert from 'node:assert'
import { it } from 'mocha'
import Signal from '../lib/index.js'
import { encode, decode, parallelAdder } from './_adder.js'

it('16-bit adder', function () {
  const x = 47813
  const y = 19987
  const { a, b, s, cout } = parallelAdder(Signal.of(0))
  encode(x).forEach((v, i) => a[i](v))
  encode(y).forEach((v, i) => b[i](v))
  const z = decode([...s.map(x => x()), cout()])
  assert.strictEqual(z, x + y)
})
