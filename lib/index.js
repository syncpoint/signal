import Signal from './Signal.js'
import ap from './ap.js'
import chain from './chain.js'
import filter from './filter.js'
import fromListeners from './fromListeners.js'
import isSignal from './isSignal.js'
import lift from './lift.js'
import link from './link.js'
import loop from './loop.js'
import map from './map.js'
import merge from './merge.js'
import of from './of.js'
import on from './on.js'
import scan from './scan.js'
import startWith from './startWith.js'
import tap from './tap.js'
import transduce from './transduce.js'

Signal.of = Signal['fantasy-land/of'] = of
Signal.link = link
Signal.map = map
Signal.filter = filter
Signal.ap = ap
Signal.chain = chain
Signal.on = on

Signal.isSignal = isSignal
Signal.fromListeners = fromListeners
Signal.lift = lift
Signal.loop = loop
Signal.merge = merge
Signal.scan = scan
Signal.startWith = startWith
Signal.tap = tap
Signal.transduce = transduce

/**
 * label :: Signal s => s -> String
 * label :: Signal s => s -> String => Unit
 */
Signal.label = (signal, ...args) =>
  args.length === 0
    ? signal.label
    : signal.label = args[0]

export default Signal
