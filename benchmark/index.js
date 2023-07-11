require('@babel/register')
const R = require('ramda')
const Benchmark = require('benchmark')
const Signal = require('../lib/signal').default
const suite = new Benchmark.Suite('@syncpoint/signal')

const {
  isSignal,
  link, chain, startWith, scan, tap, loop, lift,
  fromListeners, skipRepeats
} = Signal

suite.add('of', () => Signal.of())
suite.add('of(Number)', () => Signal.of(20))
suite.add('set', () => { const x = Signal.of(10); x(20) })

suite.add('map (1-fold)', () => {
  const x = R.range(1, 1 + 1).reduce(acc => {
    return acc.map(x => x + 1)
  }, Signal.of(10))
  return x() === 12
})

suite.add('map (3-fold)', () => {
  const x = R.range(1, 1 + 3).reduce(acc => {
    return acc.map(x => x + 1)
  }, Signal.of(10))
  return x() === 12
})

suite.add('map (10-fold)', () => {
  const x = R.range(1, 1 + 10).reduce(acc => {
    return acc.map(x => x + 1)
  }, Signal.of(10))
  return x() === 12
})

suite.add('adder', () => {
  const xor = R.unapply(link((a, b) => a ^ b))
  const and = R.unapply(link((a, b) => a & b))
  const or = R.unapply(link((a, b) => a | b))
  const toString = radix => s => s.toString(radix)
  const padStart = (length, pad) => s => s.padStart(length, pad)
  const split = separator => s => s.split(separator)
  const decode = xs => parseInt(xs.reverse().join(''), 2)
  const encode = R.compose(
    R.reverse, R.map(Number), split(''), padStart(16, '0'), toString(2)
  )

  const fullAdder = ([a, b, cin]) => {
    const x = xor(a, b)
    const s = xor(x, cin)
    const cout = or(and(x, cin), and(a, b))
    return [s, cout]
  }

  const parallelAdder = cin => R.range(0, 16).reduce(acc => {
    const ab = [Signal.of(), Signal.of()]
    const [s, cout] = fullAdder([...ab, acc.cout])
    acc.a.push(ab[0]); acc.b.push(ab[1]); acc.s.push(s)
    acc.cout = cout
    return acc
  }, { a: [], b: [], s: [], cout: cin })

  const { a, b, s, cout } = parallelAdder(Signal.of(0))
  encode(47813).forEach((v, i) => a[i](v))
  encode(19987).forEach((v, i) => b[i](v))
  const z = decode([...s.map(s => s()), cout()])
  return z === 67800
})

suite.on('cycle', event => {
  const benchmark = event.target
  console.log(benchmark.toString())
})

suite.run()
