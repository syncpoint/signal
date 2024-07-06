import * as R from 'ramda'
import Signal from '../lib/index.js'

const { link } = Signal

const xor = R.unapply(link((a, b) => a ^ b))
const and = R.unapply(link((a, b) => a & b))
const or = R.unapply(link((a, b) => a | b))
const toString = radix => s => s.toString(radix)
const padStart = (length, pad) => s => s.padStart(length, pad)
const split = separator => s => s.split(separator)

export const decode = xs => parseInt(xs.reverse().join(''), 2)

export const encode = R.compose(
  R.reverse,
  R.map(Number),
  split(''),
  padStart(16, '0'),
  toString(2)
)

const fullAdder = ([a, b, cin]) => {
  const x = xor(a, b)
  const s = xor(x, cin)
  const cout = or(and(x, cin), and(a, b))
  return [s, cout]
}

export const parallelAdder = cin => R.range(0, 16).reduce(acc => {
  const ab = [Signal.of(), Signal.of()]
  const [s, cout] = fullAdder([...ab, acc.cout])
  acc.a.push(ab[0]); acc.b.push(ab[1]); acc.s.push(s)
  acc.cout = cout
  return acc
}, { a: [], b: [], s: [], cout: cin })
