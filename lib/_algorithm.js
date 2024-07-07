/**
 * defined :: Signal s => [s any] -> boolean
 */
export const defined = xs =>
  xs.every(s => s.value !== undefined)

const values = signal => signal.sources.map(s => s.value)

/**
 * update :: Signal s => s a -> a -> boolean
 */
const update = (signal, value) => {
  if (value === undefined) return false
  if (signal.equals(signal.value, value)) return false
  signal.value = value
  return true
}

/**
 * evaluate :: Signal s => s => [any]
 */
export const evaluate = signal =>
  defined(signal.sources)
    ? signal.fn(...values(signal))
    : undefined

const increment = signal => {
  signal.stale += 1
  signal.evaluate = false
  signal.sinks.forEach(increment)
}

const decrement = sourceChanged => signal => {
  signal.stale -= 1
  signal.evaluate ||= sourceChanged

  const changed =
    signal.stale === 0 &&
    signal.evaluate &&
    update(signal, evaluate(signal))

  signal.sinks.forEach(decrement(changed))
}

/**
 * set :: Signal s => s a -> a -> s a
 */
export const set = (signal, value) => {
  const changed = update(signal, value)
  signal.sinks.forEach(increment)
  signal.sinks.forEach(decrement(changed))
  return signal
}
