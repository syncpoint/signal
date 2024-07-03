import curry from './curry.js'
import link from './link.js'

/**
 * ap :: Signal s => s (a -> b) -> s a -> s b
 */
const ap = curry((sfn, sa) =>
  link((fn, a) => fn(a), [sfn, sa])
)

export default ap
