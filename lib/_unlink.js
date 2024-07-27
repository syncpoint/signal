import { deletesink } from './_graph.js'

const unlink = (signal, sink) => {
  deletesink(sink, signal)
  if (signal.dispose) signal.dispose()
}

export default unlink
