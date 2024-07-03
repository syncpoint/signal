import curry from './curry.js'
import link from './link.js'

/**
 * scan :: Signal s => (b -> a -> b) -> b -> s a -> s b
 */
const scan = curry((fn, acc, signal) =>
  link(x => (acc = fn(acc, x)), signal)
)

export default scan
