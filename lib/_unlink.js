const unlink = (signal, sink) => {
  const index = signal.sinks.indexOf(sink)
  signal.sinks.splice(index, 1)
  if (signal.dispose) signal.dispose()
}

export default unlink
