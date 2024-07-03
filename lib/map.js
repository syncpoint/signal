import curry from './curry.js'
import link from './link.js'

/**
 * map :: Signal s => (a -> b) -> s a -> s b
 */
const map = curry((fn, signal) =>
  link(a => fn(a), signal)
)

export default map
