import curry from './curry.js'
import link from './link.js'
import of from './of.js'

/**
 * merge :: Signal s => s a -> s b -> s (a | b)
 *
 * flyd compatibility
 */
const merge = curry((a, b) => {
  const self = of()
  link(self, a)
  link(self, b)
  return self
})

export default merge