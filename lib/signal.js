import ap from './ap.js'
import chain from './chain.js'
import filter from './filter.js'
import map from './map.js'
import on from './on.js'

/**
 * Signal :: a => Signal a
 */
const Signal = atom => {
  atom.map = fn => map(fn, atom)
  atom.filter = fn => filter(fn, atom)
  atom.ap = sfn => ap(sfn, atom)
  atom.chain = fn => chain(fn, atom)
  atom.on = fn => on(fn, atom)

  // flyd compatibility:
  atom.pipe = fn => fn(atom)

  // Fantasy Land compatibility:
  atom.constructor = Signal
  atom['fantasy-land/map'] = atom.map
  atom['fantasy-land/filter'] = atom.filter
  atom['fantasy-land/ap'] = atom.ap
  atom['fantasy-land/chain'] = atom.chain

  atom.toString = () => `stream(${atom.value})`
  atom.toJSON = () => atom.value

  return atom
}

export default Signal
