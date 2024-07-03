const unlink = (signal, dependent) => {
  const index = signal.dependent.indexOf(dependent)
  signal.dependent.splice(index, 1)
  if (signal.dispose) signal.dispose()
}

export default unlink
