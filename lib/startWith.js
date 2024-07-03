import curry from './curry.js'
import link from './link.js'
import of from './of.js'

/**
 * startWith :: Signal s => a -> s a -> s a
 * startWith :: Signal s => (() -> a) -> s a -> s a
 */
const startWith = curry((initial, signal) => {
  const value = (typeof initial === 'function') ? initial() : initial
  const self = of(value)
  link(self, signal)
  return self
})

export default startWith
