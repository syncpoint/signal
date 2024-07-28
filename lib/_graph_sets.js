import curry from "./curry.js"

const state = {
  signals: new Set(), // signals :: Signal s => [s]
  sinks: new Map(), // sinks :: Signal s => { k: s, v: [s] }
  sources: new Map()
}

const addsink = curry((sink, signal) => state.sinks.get(signal).push(sink))
export const sinks = signal => state.sinks.get(signal)
export const sources = signal => state.sources.get(signal)

export const addsignal = (signal, sources = []) => {
  state.signals.add(signal)
  state.sinks.set(signal, [])
  state.sources.set(signal, sources)

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
  [...state.signals].filter(x => sources(x).length === 0)

export const signals = () =>
  [...state.signals]