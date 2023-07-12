const curry = fn => function rec (...args) {
  return args.length >= fn.length
    ? fn(...args)
    : (...xs) => rec(...args, ...xs)
}

/**
 * Signal :: a => Signal a
 */
const Signal = atom => {
  atom.map = fn => Signal.map(fn, atom)
  atom.filter = fn => Signal.filter(fn, atom)
  atom.ap = sfn => Signal.ap(sfn, atom)
  atom.chain = fn => Signal.chain(fn, atom)
  atom.on = fn => Signal.on(fn, atom)

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

/**
 * of :: a -> Signal a
 */
Signal.of =
Signal['fantasy-land/of'] = value => {
  const atom = (...args) =>
    args.length === 0
      ? atom.value
      : set(atom, ...args)

  atom.value = value
  atom.defined = value !== undefined
  atom.dependent = []
  return Signal(atom)
}

module.exports = Signal

/**
 * link :: Signal s => (...[*] -> b) -> [s *] -> s b
 * link :: Signal s => (a -> b) -> s a -> s b
 *
 * Link one or more input signals to a output signal.
 */
Signal.link = curry((fn, inputs) => {
  if (!fn) throw new TypeError('"fn" is undefined')
  else if (!inputs) throw new TypeError('"inputs" is undefined')
  else if (!Array.isArray(inputs) && Signal.isSignal(inputs)) return Signal.link(fn, [inputs])
  else if (!Array.isArray(inputs)) throw new TypeError('"inputs" is not an array')
  else if (inputs.length === 0) throw new TypeError('"inputs" is empty array')
  else if (inputs.some(x => !Signal.isSignal(x))) throw new TypeError('"inputs" contains non-signal or falsy value')

  const atom = (...args) => {
    if (args.length === 0) return atom.value
    else throw new TypeError('read-only signal')
  }

  atom.fn = fn // link production/body
  atom.inputs = inputs
  atom.dependent = []

  // Append self to dependent list of all input signals:
  inputs.forEach(input => input.dependent.push(atom))
  return Signal(evaluate(atom))
})

const unlink = (signal, dependent) => {
  const index = signal.dependent.indexOf(dependent)
  signal.dependent.splice(index, 1)
  if (signal.dispose) signal.dispose()
}

/**
 * set :: Signal s => s a -> a -> s a
 *
 * Set signal value and evaluate dependent.
 */
const set = (signal, value) => {
  signal.defined = value !== undefined
  if (signal.defined) {
    signal.value = value
    // Topological order of direct and indirect outputs (leafs last).
    // Note: sort must be stable to keep order within same level.

    toposort(q(signal)).forEach(evaluate)
  }

  return signal
}

/**
 * q :: Signal s => s -> [s]
 * q :: Signal s => s -> [s] -> Number -> [s]
 *
 * Signal's direct/indirect dependent in breath-first order.
*/
const q = (signal, acc = [], level = 1) =>
  signal.dependent.reduce((acc, o) => {
    // Prevent adding one signal multiple times:
    if (!o.level) { o.level = level; acc.push(o) }
    return q(o, acc, level + 1)
  }, acc)

/**
 * evaluate :: Signal s => s -> s
 *
 * Evaluate and update linked signal.
 */
const evaluate = signal => {
  delete signal.level
  return signal.inputs.every(s => s.defined)
    ? update(signal)
    : signal
}

const toposort = xs => xs.sort((a, b) => a.level - b.level)
const update = signal => set(signal, signal.fn(...values(signal)))
const values = signal => signal.inputs.map(s => s.value)

/**
 * map :: Signal s => (a -> b) -> s a -> s b
 */
Signal.map = curry((fn, signal) =>
  Signal.link(a => fn(a), signal)
)

/**
 * filter :: Signal s => (a -> Boolean) -> s a -> s a
 */
Signal.filter = curry((fn, signal) => {
  const self = Signal.of()
  Signal.link(a => fn(a) && self(a), signal)
  return self
})

/**
 * ap :: Signal s => s (a -> b) -> s a -> s b
 */
Signal.ap = curry((sfn, sa) =>
  Signal.link((fn, a) => fn(a), [sfn, sa])
)

/**
 * chain :: Signal s => (a -> s b) -> s a -> s b
 */
Signal.chain = curry((fn, sa) => {
  let dispose // dispose effect if any
  const self = Signal.of()
  Signal.link(a => {
    dispose && dispose()
    const sb = fn(a)
    dispose = Signal.isSignal(sb) && Signal.on(self, sb)
  }, [sa])
  return self
})

/**
 * on :: Signal s => (a -> *) -> s a -> (() -> Unit)
 */
Signal.on = curry((fn, signal) => {
  const effect = Signal.link(fn, signal)
  return () => unlink(signal, effect)
})

/**
 * startWith :: Signal s => a -> s a -> s a
 * startWith :: Signal s => (() -> a) -> s a -> s a
 */
Signal.startWith = curry((initial, signal) => {
  const value = (typeof initial === 'function') ? initial() : initial
  const self = Signal.of(value)
  Signal.link(self, signal)
  return self
})

/**
 * scan :: Signal s => (b -> a -> b) -> b -> s a -> s b
 */
Signal.scan = curry((fn, acc, signal) =>
  Signal.link(x => (acc = fn(acc, x)), signal)
)

/**
 * tap :: Signal s => (a -> any) -> s a -> s a
 */
Signal.tap = curry((fn, signal) =>
  Signal.link(a => { fn(a); return a }, signal)
)

/**
 * loop :: Signal s => (b -> a -> [b, c]) -> b -> s a -> s c
 */
Signal.loop = curry((fn, acc, signal) =>
  Signal.link(a => {
    const [current, value] = fn(acc, a)
    acc = current
    return value
  }, signal)
)

/**
 * lift :: Signal s => ((a -> b -> ...) -> x) -> s a -> s b -> ... -> s x
 */
Signal.lift = (fn, ...signals) =>
  Signal.link((...values) => fn(...values), signals)

/**
 * fromListeners :: [String] -> Target -> Signal Event
 */
Signal.fromListeners = curry((types, target) => {
  const self = Signal.of()
  const add = type => target.addEventListener(type, self)
  const remove = type => target.removeEventListener(type, self)
  types.forEach(add)
  self.dispose = () => types.forEach(remove)
  return self
})

/**
 * skipRepeats :: Signal s => s a -> s a
 * skipRepeats :: Signal s => (a -> a -> Boolean) -> s a -> s a
 */
Signal.skipRepeats = (...args) => {
  const eq = (a, b) => a === b
  const fn = curry((eq, signal) => {
    const self = Signal.of()
    let last
    Signal.link(x => {
      if (last === undefined) self(x)
      else if (!eq(last, x)) self(x)
      last = x
    }, signal)
    return self
  })

  if (args.length === 1) {
    if (Signal.isSignal(args[0])) return fn(eq, args[0])
    else return fn(eq)
  } else if (args.length === 2) return fn(...args)
}

/**
 * merge :: Signal s => s a -> s b -> s (a | b)
 *
 * flyd compatibility
 */
Signal.merge = curry((a, b) => {
  const self = Signal.of()
  Signal.link(self, a)
  Signal.link(self, b)
  return self
})

/**
 * isSignal :: any -> Boolean
 */
Signal.isSignal =
  x => x &&
  x.constructor === Signal
