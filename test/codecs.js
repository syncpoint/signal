const R = require('ramda')
const toString = radix => s => s.toString(radix)
const padStart = (length, pad) => s => s.padStart(length, pad)
const split = separator => s => s.split(separator)

const decode = xs => parseInt(xs.reverse().join(''), 2)
const encode = R.compose(R.reverse, R.map(Number), split(''), padStart(16, '0'), toString(2))

module.exports = {
  decode,
  encode
}
