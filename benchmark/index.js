require('@babel/register')
const R = require('ramda')
const Benchmark = require('benchmark')
const Signal = require('../lib/signal')
const { signal } = require('@preact/signals-core')
const { encode, decode } = require('../test/codecs')
const { adder: syncpointAdder } = require('../test/adder-syncpoint')
const { adder: preactAdder } = require('../test/adder-preact')

const pairs = n => R.range(0, n).map(() => {
  const a = Math.floor(Math.random() * 30000)
  const b = Math.floor(Math.random() * 30000)
  const c = a + b
  return [a, b, c]
})

const suite = new Benchmark.Suite('adder')

suite.add('syncpoint', () => {
  const { a, b, s, cout } = syncpointAdder(Signal.of(0))
  return pairs(100).every(pair => {
    encode(pair[0]).forEach((v, i) => a[i](v))
    encode(pair[1]).forEach((v, i) => b[i](v))
    const z = decode([...s.map(s => s()), cout()])
    return z === pair[2]
  })
})

suite.add('preact', () => {
  const { a, b, s, cout } = preactAdder(signal(0))
  return pairs(100).every(pair => {
    encode(pair[0]).forEach((v, i) => (a[i].value = v))
    encode(pair[1]).forEach((v, i) => (b[i].value = v))
    const z = decode([...s.map(s => s.value), cout.value])
    return z === pair[2]
  })
})

suite.on('cycle', event => {
  const benchmark = event.target
  console.log(benchmark.toString())
})

suite.run()
