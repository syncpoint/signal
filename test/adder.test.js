import assert from 'assert'
import { it } from 'mocha'
import Signal from '../lib/index.js'
import { encode, decode, parallelAdder } from './adder.js'

it('16-bit adder', function () {
  const cin = Signal.of(0)
  Signal.label(cin, 'cin')
  const { a, b, s, cout } = parallelAdder(cin)
  encode(47813).forEach((v, i) => a[i](v))
  encode(19987).forEach((v, i) => b[i](v))
  const z = decode([...s.map(s => s()), cout()])
  assert.strictEqual(z, 67800)
})
