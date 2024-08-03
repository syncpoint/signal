import curry from './curry.js'

/**
 * lte :: Signal s => s a -> s b -> Boolean
 */
const lte = curry((a, b) => a() <= b())

export default lte
