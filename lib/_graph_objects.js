import curry from "./curry.js"

const state = {
  signals: {},
  sinks: {},
  sources: {}
}

const addsink = curry((sink, signal) => state.sinks[signal.id].push(sink))
export const sinks = signal => state.sinks[signal.id]
export const sources = signal => state.sources[signal.id]

export const addsignal = (signal, sources = []) => {
  state.signals[signal.id] = signal
  state.sinks[signal.id] = []
  state.sources[signal.id] = sources

  // push signal to sink list of every source.
  sources.forEach(addsink(signal))

  return signal
}

export const deletesink = (sink, signal) => {
  const xs = sinks(signal)
  const index = xs.indexOf(sink)
  xs.splice(index, 1)
}

export const inputs = () =>
  Object.values(state.signals)
    .filter(x => sources(x).length === 0)

export const signals = () =>
  Object.values(state.signals)