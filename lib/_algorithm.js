/**
 *
 */
const toposort = xs => xs.sort((a, b) => a.level - b.level)

/**
 * q :: Signal s => s -> [s]
 * q :: Signal s => s -> [s] -> Number -> [s]
 *
 * Signal's direct/indirect sinks in breath-first order.
*/
const q = (signal, acc = [], level = 1) =>
  signal.sinks.reduce((acc, o) => {
    // Prevent adding one signal multiple times:
    if (!o.level) { o.level = level; acc.push(o) }
    return q(o, acc, level + 1)
  }, acc)


/**
 * set :: Signal s => s a -> a -> s a
 *
 * Set signal value and evaluate sinks.
 */
export const set = (signal, value) => {
  if (signal.value === value) return signal
  signal.defined = value !== undefined
  if (signal.defined) {
    signal.value = value
    // Topological order of direct and indirect outputs (leafs last).
    // Note: sort must be stable to keep order within same level.
    toposort(q(signal)).forEach(evaluate)
  }

  return signal
}

/**
 *
 */
const values = signal => signal.inputs.map(s => s.value)

/**
 * defined :: Signal s => s any -> boolean
 * defined :: Signal s => [s any] -> boolean
 */
const defined = arg =>
  Array.isArray(arg)
    ? arg.every(x => x.defined)
    : arg.defined

/**
 *
 */
const update = signal => set(signal, signal.fn(...values(signal)))

/**
 * evaluate :: Signal s => s -> s
 *
 * Evaluate and update linked signal.
 */
export const evaluate = signal => {
  delete signal.level
  return defined(signal.inputs)
    ? update(signal)
    : signal
}
