import Signal from './signal.js'

/**
 * await :: Signal s => s Promise a -> s a
 */
const await_ = input => {
  const output = Signal.of()
  input.on(async pa => output(await pa))
  return output
}

export default await_
