const assert = require('assert')
const { it } = require('mocha')
const Signal = require('../lib/signal')
const { encode, decode } = require('./codecs')
const { adder } = require('./adder-syncpoint')

it('16-bit adder (syncpoint)', function () {
  const { a, b, s, cout } = adder(Signal.of(0))
  encode(47813).forEach((v, i) => a[i](v))
  encode(19987).forEach((v, i) => b[i](v))
  const z = decode([...s.map(s => s()), cout()])
  assert.strictEqual(z, 67800)
})
