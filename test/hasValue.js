import Signal from '../lib/index.js'

const hasValue = (x, v) =>
  Signal.is(x) && x() === v

export default hasValue
