import Signal from './signal.js'
import { set } from './_algorithm.js'
import { defaultEquals } from './_equality.js'

/**
 *
 */
const of = (value, options = {}) => {
  const atom = (...args) =>
    args.length === 0
      ? atom.value
      : set(atom, ...args)

  atom.equals = options.equals ?? defaultEquals
  atom.stale = 0 // number of stale sources
  atom.value = value
  atom.sinks = []
  return Signal(atom)
}

export default of
