#!/usr/bin/env node
const R = require('ramda')
const Signal = require('../lib/signal')
const { encode, decode } = require('../test/codecs')
const { adder } = require('../test/adder-syncpoint')

const pairs = R.range(0, 2000).map(() => {
  const a = Math.floor(Math.random() * 30000)
  const b = Math.floor(Math.random() * 30000)
  return [a, b, a + b]
})

const { a, b, s, cout } = adder(Signal.of(0))
console.profile()
pairs.map(([ai, bi, zo]) => {
  encode(ai).forEach((v, i) => a[i](v))
  encode(bi).forEach((v, i) => b[i](v))
  const z = decode([...s.map(s => s()), cout()])
  return z === zo
})
console.profileEnd()
