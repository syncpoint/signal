import Signal from './Signal.js'
import curry from "./curry.js"
import isSignal from "./isSignal.js"
import { evaluate } from './_algorithm.js'
import { defaultEquals } from './_equality.js'
import { addsignal } from './_graph.js'

/**
 * link :: Signal s => (...[*] -> b) -> [s *] -> s b
 * link :: Signal s => (a -> b) -> s a -> s b
 *
 * Link one or more source signals to a output signal.
 */
const link = curry((fn, sources, options = {}) => {
  sources = (Array.isArray(sources) ? sources : [sources]).
    filter(Boolean)

  if (!fn) throw new TypeError('"fn" is undefined')
  else if (sources.length === 0) throw new TypeError('"inputs" is empty array')
  else if (sources.some(x => !isSignal(x))) throw new TypeError('"inputs" contains non-signal or falsy value')

  const atom = (...args) => {
    if (args.length === 0) return atom.value
    else throw new TypeError('read-only signal')
  }

  atom.id = crypto.randomUUID()
  const signal = Signal(atom)
  addsignal(signal, sources)

  // NOTE: `evaluate` depends on sources to be set up already.
  atom.label = undefined
  atom.equals = options.equals ?? defaultEquals
  atom.fn = fn // link production/body
  atom.stale = 0 // number of stale sources
  atom.value = evaluate(atom)

  return signal
})

export default link
