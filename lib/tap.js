import curry from './curry.js'
import link from './link.js'

/**
 * tap :: Signal s => (a -> any) -> s a -> s a
 */
const tap = curry((fn, signal) =>
  link(a => { fn(a); return a }, signal)
)

export default tap
