import Signal from './Signal.js'
import { set } from './_algorithm.js'
import { defaultEquals } from './_equality.js'
import { addsignal } from './_graph.js'

/**
 *
 */
const of = (value, options = {}) => {
  const atom = (...args) =>
    args.length === 0
      ? atom.value
      : set(atom, ...args)

  atom.label = crypto.randomUUID()
  atom.equals = options.equals ?? defaultEquals
  atom.stale = 0 // number of stale sources
  atom.value = value

  const signal = Signal(atom)
  addsignal(signal)

  return signal
}

export default of
