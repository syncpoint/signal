import Signal from './Signal.js'
import curry from "./curry.js"
import isSignal from "./isSignal.js"
import { evaluate } from './_algorithm.js'

/**
 * link :: Signal s => (...[*] -> b) -> [s *] -> s b
 * link :: Signal s => (a -> b) -> s a -> s b
 *
 * Link one or more input signals to a output signal.
 */
const link = curry((fn, inputs) => {
  if (!fn) throw new TypeError('"fn" is undefined')
  else if (!inputs) throw new TypeError('"inputs" is undefined')
  else if (!Array.isArray(inputs) && isSignal(inputs)) return link(fn, [inputs])
  else if (!Array.isArray(inputs)) throw new TypeError('"inputs" is not an array')
  else if (inputs.length === 0) throw new TypeError('"inputs" is empty array')
  else if (inputs.some(x => !isSignal(x))) throw new TypeError('"inputs" contains non-signal or falsy value')

  const atom = (...args) => {
    if (args.length === 0) return atom.value
    else throw new TypeError('read-only signal')
  }

  atom.fn = fn // link production/body
  atom.inputs = inputs
  atom.sinks = []

  // Append self to sinks of all input signals:
  inputs.forEach(input => input.sinks.push(atom))
  return Signal(evaluate(atom))
})

export default link