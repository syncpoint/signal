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

const fullAdder = ([a, b, cin], i) => {
  const x = xor(a, b)
  const s = xor(x, cin)
  const and0 = and(x, cin)
  const and1 = and(a, b)
  const cout = or(and0, and1)
  Signal.label(x, `xor_${i}:0`)
  Signal.label(s, `xor_${i}:1`)
  Signal.label(and0, `and_${i}:0`)
  Signal.label(and1, `and_${i}:1`)
  Signal.label(cout, `or_${i}`)
  return [s, cout]
}

export const parallelAdder = cin => R.range(0, 16).reduce((acc, i) => {
  const ab = [Signal.of(), Signal.of()]
  Signal.label(ab[0], `a_${i}`)
  Signal.label(ab[1], `b_${i}`)

  const [s, cout] = fullAdder([...ab, acc.cout], i)
  acc.a.push(ab[0]); acc.b.push(ab[1]); acc.s.push(s)
  acc.cout = cout
  return acc
}, { a: [], b: [], s: [], cout: cin })
