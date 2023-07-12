const R = require('ramda')
const { signal, computed } = require('@preact/signals-core')

const xor = (a, b) => computed(() => a.value ^ b.value)
const or = (a, b) => computed(() => a.value | b.value)
const and = (a, b) => computed(() => a.value & b.value)

const full = ([a, b, cin]) => {
  const x = xor(a, b)
  const s = xor(x, cin)
  const cout = or(and(x, cin), and(a, b))
  return [s, cout]
}

const parallel = cin => R.range(0, 16).reduce(acc => {
  const ab = [signal(), signal()]
  const [s, cout] = full([...ab, acc.cout])
  acc.a.push(ab[0]); acc.b.push(ab[1]); acc.s.push(s)
  acc.cout = cout
  return acc
}, { a: [], b: [], s: [], cout: cin })

module.exports = {
  adder: parallel
}
