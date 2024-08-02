import Signal from '../lib/index.js'

const diamond = (fn, input) => Signal.link(fn, [
  Signal.link(a => a + 1, input),
  Signal.link(a => a + 2, input)
])

export default diamond
