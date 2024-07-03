import link from './link.js'

/**
 * lift :: Signal s => ((a -> b -> ...) -> x) -> s a -> s b -> ... -> s x
 */
const lift = (fn, ...signals) =>
  link((...values) => fn(...values), signals)

export default lift
