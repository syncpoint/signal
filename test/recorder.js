import Signal from '../lib/index.js'

const recorder = inputs => {
  const acc = []
  Signal.link((...values) => acc.push(values.join(':')), inputs)
  return () => acc
}

export default recorder
