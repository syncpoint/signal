import curry from './curry.js'
import link from './link.js'

function XWrap(f) { this.f = f }
XWrap.prototype['@@transducer/step'] = (acc, value) => value

const transduce = curry((xf, signal) => {
  xf = xf(new XWrap(xf))
  return link(x => xf['@@transducer/step'](undefined, x), [signal])
})

export default transduce
