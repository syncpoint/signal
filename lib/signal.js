import ap from './ap.js'
import chain from './chain.js'
import equals from './equals.js'
import filter from './filter.js'
import lte from './lte.js'
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
  atom.equals = equals(atom)
  atom.lte = lte(atom)
  atom.on = fn => on(fn, atom)

  // Fantasy Land compatibility:
  atom.constructor = Signal
  atom['fantasy-land/map'] = atom.map
  atom['fantasy-land/filter'] = atom.filter
  atom['fantasy-land/ap'] = atom.ap
  atom['fantasy-land/chain'] = atom.chain
  atom['fantasy-land/equals'] = atom.equals
  atom['fantasy-land/lte'] = atom.lte

  atom.toJSON = () => atom.value
  atom.toString = () => atom.__label
    ? `Signal[${atom.__label}](${atom.value})`
    : `Signal(${atom.value})`

  return atom
}

export default Signal
