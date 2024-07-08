import Signal from './Signal.js'

/**
 * isSignal :: any -> boolean
 */
const isSignal =
  x => x &&
  x.constructor === Signal

export default isSignal
