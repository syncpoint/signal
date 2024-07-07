import curry from './curry.js'
import link from './link.js'
import unlink from './_unlink.js'

/**
 * on :: Signal s => (a -> *) -> s a -> (() -> Unit)
 */
const on = curry((fn, signal) => {
  const effect = link(fn, signal)
  return () => unlink(signal, effect)
})

export default on
