import Signal from './signal.js'

/**
 * is :: any -> boolean
 */
const is =
  x => x &&
  x.constructor === Signal

export default is
