import Signal from './Signal.js'
import { set } from './_algorithm.js'

/**
 *
 */
const of = value => {
  const atom = (...args) =>
    args.length === 0
      ? atom.value
      : set(atom, ...args)

  atom.stale = 0 // number of stale sources
  atom.value = value
  atom.sinks = []
  return Signal(atom)
}

export default of
