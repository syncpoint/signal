import curry from "./curry.js"

const addsink = curry((sink, signal) => signal.sinks.push(sink))
export const sinks = signal => signal.sinks
export const sources = signal => signal.sources

export const addsignal = (signal, sources = []) => {
  signal.sinks = []
  signal.sources = sources

  // push signal to sink list of every source.
  sources.forEach(addsink(signal))

  return signal
}

export const deletesink = (sink, signal) => {
  const xs = signal.sinks
  const index = xs.indexOf(sink)
  xs.splice(index, 1)
}

export const inputs = () => []
export const signals = () => []