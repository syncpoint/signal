import Signal from './Signal.js'
import curry from "./curry.js"
import isSignal from "./isSignal.js"
import { evaluate } from './_algorithm.js'

/**
 * link :: Signal s => (...[*] -> b) -> [s *] -> s b
 * link :: Signal s => (a -> b) -> s a -> s b
 *
 * Link one or more source signals to a output signal.
 */
const link = curry((fn, sources) => {
  sources = (Array.isArray(sources) ? sources : [sources]).
    filter(Boolean)

  if (!fn) throw new TypeError('"fn" is undefined')
  else if (sources.length === 0) throw new TypeError('"inputs" is empty array')
  else if (sources.some(x => !isSignal(x))) throw new TypeError('"inputs" contains non-signal or falsy value')

  const atom = (...args) => {
    if (args.length === 0) return atom.value
    else throw new TypeError('read-only signal')
  }

  atom.fn = fn // link production/body
  atom.sources = sources
  atom.sinks = []
  atom.stale = 0 // number of stale sources
  atom.value = evaluate(atom)

  // Append self to sinks of all source signals:
  sources.forEach(source => source.sinks.push(atom))
  return Signal(atom)
})

export default link
