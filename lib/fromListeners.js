import curry from './curry.js'
import of from './of.js'

/**
 * fromListeners :: [String] -> Target -> Signal Event
 */
const fromListeners = curry((types, target) => {
  const on = (target.addEventListener || target.on).bind(target)
  const off = (target.removeEventListener || target.off).bind(target)

  const self = of()
  const add = type => on(type, self)
  const remove = type => off(type, self)
  types.forEach(add)
  self.dispose = () => types.forEach(remove)
  return self
})

export default fromListeners
