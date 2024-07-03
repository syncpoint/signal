import curry from './curry.js'
import link from './link.js'
import of from './of.js'

/**
 * filter :: Signal s => (a -> Boolean) -> s a -> s a
 */
const filter = curry((fn, signal) => {
  const self = of()
  link(a => fn(a) && self(a), signal)
  return self
})

export default filter
