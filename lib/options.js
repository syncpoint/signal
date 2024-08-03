/**
 * options :: Signal s => s -> {k: v}
 * options :: Signal s => s -> {k: v} -> s
 *
 * Get/set options. Available options:
 * equals :: Signal s => s -> s -> Boolean
 * label :: String
 */
const options = (...args) => {
  if (args.length === 1) {
    const options = {}
    if (args[0].__equals) options.equals = args[0].__equals
    if (args[0].__label) options.label = args[0].__label
    return options
  } else if (args.length === 2) {
    if (args[1].equals) args[0].__equals = args[1].equals
    if (args[1].label) args[0].__label = args[1].label
    return args[0]
  } else return args[0]
}

export default options
