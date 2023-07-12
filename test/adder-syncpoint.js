const R = require('ramda')
const Signal = require('../lib/signal')

const xor = R.unapply(Signal.link((a, b) => a ^ b))
const and = R.unapply(Signal.link((a, b) => a & b))
const or = R.unapply(Signal.link((a, b) => a | b))

const full = ([a, b, cin]) => {
  const x = xor(a, b)
  const s = xor(x, cin)
  const cout = or(and(x, cin), and(a, b))
  return [s, cout]
}

const parallel = cin => R.range(0, 16).reduce(acc => {
  const ab = [Signal.of(), Signal.of()]
  const [s, cout] = full([...ab, acc.cout])
  acc.a.push(ab[0]); acc.b.push(ab[1]); acc.s.push(s)
  acc.cout = cout
  return acc
}, { a: [], b: [], s: [], cout: cin })

module.exports = {
  adder: parallel
}
