const assert = require('assert')
const { it } = require('mocha')
const { signal } = require('@preact/signals-core')
const { encode, decode } = require('./codecs')
const { adder } = require('./adder-preact')

it('16-bit adder (preact)', function () {
  const { a, b, s, cout } = adder(signal(0))
  encode(47813).forEach((v, i) => (a[i].value = v))
  encode(19987).forEach((v, i) => (b[i].value = v))
  const z = decode([...s.map(s => s.value), cout.value])
  assert.strictEqual(z, 67800)
})
