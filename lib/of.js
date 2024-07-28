import Signal from './Signal.js'
import { set } from './_algorithm.js'
import { defaultEquals } from './_equality.js'
import { addsignal } from './_graph.js'

/**
 * of :: Signal s => () -> s undefined
 * of :: Signal s => v -> s v
 */
const of = (value, options = {}) => {
  const atom = (...args) =>
    args.length === 0
      ? atom.value
      : set(atom, ...args)

  atom.id = crypto.randomUUID()
  atom.label = undefined
  atom.equals = options.equals ?? defaultEquals
  atom.stale = 0 // number of stale sources
  atom.value = value

  const signal = Signal(atom)
  return addsignal(signal)
}

export default of
