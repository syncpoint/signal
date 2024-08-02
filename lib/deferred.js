import of from './of.js'

/**
 * deferred :: Signal s => v -> s v
 * deferred :: Signal s => () -> v -> s v
 * deferred :: Signal s, Promise p => p v -> s v
 * deferred :: Signal s, Promise p => () -> p v -> s v
 */
const deferred = arg => {
  const s = of()
  ;(async () => s(await (typeof arg  === 'function' ? arg() : arg)))()
  return s
}

export default deferred
