import curry from './curry.js'

/**
 * equals :: Signal s => s a -> s b -> Boolean
 */
const equals = curry((a, b) => a() === b())

export default equals
