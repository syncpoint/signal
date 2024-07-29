export const defined = xs => xs.every(s => s.value !== undefined)
const dirty = xs => xs.some(x => x.updated === true)
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

/**
 * dfs :: Signal[] -> Set<Signal> -> Signal -> Signal[]
 */
const dfs = (acc, visited, signal) => {
  visited.add(signal)

  for(let i = signal.sinks.length - 1; i >= 0; i--) {
    const sink = signal.sinks[i]
    if (visited.has(sink)) continue
    dfs(acc, visited, sink)
  }

  acc.push(signal)
  return acc
}

/**
 * set :: Signal s => s a -> a -> s a
 */
export const set = (signal, value) => {
  const updated = update(signal, value)
  if (!updated) return signal

  // Sort all sinks topologically by depth-first search:
  const sinks = dfs([], new Set(), signal)
  sinks.forEach(sink => (sink.updated = false))
  signal.updated = true

  // Input signal is also included in `sinks` => ignore.
  for(let i = sinks.length - 2; i >= 0 ; i--) {
    const sink = sinks[i]
    if (!dirty(sink.sources)) continue
    sink.updated = update(sink, evaluate(sink))
  }

  return signal
}