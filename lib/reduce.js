import Signal from './signal.js'
import curry from "./curry.js"
import { set } from './_algorithm.js'
import { defaultEquals } from './_equality.js'

/**
 * reduce :: Signal s => (a -> b -> a) -> a -> s a
 */
const reduce = curry((fn, acc) => {
  const atom = (...args) =>
    args.length === 0
      ? atom.value
      : set(atom, fn(atom.value, ...args))

  atom.__equals = defaultEquals
  atom.stale = 0 // number of stale sources
  atom.value = acc
  atom.sinks = []
  return Signal(atom)
})

export default reduce
