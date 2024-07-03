import curry from './curry.js'
import link from './link.js'

/**
 * loop :: Signal s => (b -> a -> [b, c]) -> b -> s a -> s c
 */
const loop = curry((fn, acc, signal) =>
  link(a => {
    const [current, value] = fn(acc, a)
    acc = current
    return value
  }, signal)
)

export default loop
