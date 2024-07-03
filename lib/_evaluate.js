import set from './_set.js'

/**
 *
 */
const values = signal => signal.inputs.map(s => s.value)

/**
 *
 */
const update = signal => set(signal, signal.fn(...values(signal)))

/**
 * evaluate :: Signal s => s -> s
 *
 * Evaluate and update linked signal.
 */
const evaluate = signal => {
  delete signal.level
  return signal.inputs.every(s => s.defined)
    ? update(signal)
    : signal
}

export default evaluate
