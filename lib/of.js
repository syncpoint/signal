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

  atom.value = value
  atom.defined = value !== undefined
  atom.sinks = []
  return Signal(atom)
}

export default of
