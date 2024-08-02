import curry from './curry.js'
import is from './is.js'
import link from './link.js'
import of from './of.js'
import on from './on.js'

/**
 * chain :: Signal s => (a -> s b) -> s a -> s b
 */
const chain = curry((fn, sa) => {
  let dispose // dispose effect if any
  const self = of()
  link(a => {
    dispose && dispose()
    const sb = fn(a)
    dispose = is(sb) && on(self, sb)
  }, [sa])
  return self
})

export default chain
