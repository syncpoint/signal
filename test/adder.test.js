import assert from 'assert'
import { it } from 'mocha'
import * as R from 'ramda'
import Signal from '../lib/signal'

const { link } = Signal

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

it('16-bit adder', function () {
  const { a, b, s, cout } = parallelAdder(Signal.of(0))
  encode(47813).forEach((v, i) => a[i](v))
  encode(19987).forEach((v, i) => b[i](v))
  const z = decode([...s.map(s => s()), cout()])
  assert.strictEqual(z, 67800)
})
