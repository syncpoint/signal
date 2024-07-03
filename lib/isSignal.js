import Signal from './Signal.js'

/**
 * isSignal :: any -> Boolean
 */
const isSignal =
  x => x &&
  x.constructor === Signal

export default isSignal
