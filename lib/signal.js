const curry = fn => function rec (...args) {
  return args.length >= fn.length
    ? fn(...args)
    : (...xs) => rec(...args, ...xs)
}

const compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x)
const isFunction = a => typeof a === 'function'

// Signal evaluation stack.
const stack = (() => {
  const tap = fn => v => { fn(v); return v }
  const mark = tap(signal => (signal.queued = true))
  const unmark = tap(signal => delete signal.queued)
  const frames = []
  const push = signal => !signal.queued && frames.push(mark(signal))
  const pop = () => unmark(frames.pop())
  const length = () => frames.length
  return { push, pop, length }
})()

/**
 * Signal :: a => Signal a
 */
const Signal = atom => {
  atom.map = fn => Signal.map(fn, atom)
  atom.filter = fn => Signal.filter(fn, atom)
  atom.ap = sfn => Signal.ap(sfn, atom)
  atom.chain = fn => Signal.chain(fn, atom)

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
  const self = (...args) =>
    args.length === 0
      ? self.value
      : set(self, ...args)

  self.value = value
  self.dependent = []
  return Signal(self)
}

export default Signal

/**
 * link :: Signal s => (...[*] -> b) -> [s *] -> s b
 * link :: Signal s => (a -> b) -> s a -> s b
 * Link one or more input signals to a output signal.
 */
Signal.link = curry((fn, inputs) => {
  if (!fn) throw new TypeError('"fn" is undefined')
  else if (!inputs) throw new TypeError('"inputs" is undefined')
  else if (!Array.isArray(inputs) && Signal.isSignal(inputs)) return Signal.link(fn, [inputs])
  else if (!Array.isArray(inputs)) throw new TypeError('"inputs" is not an array')
  else if (inputs.length === 0) throw new TypeError('"inputs" is empty array')
  else if (inputs.some(x => !Signal.isSignal(x))) throw new TypeError('"inputs" contains non-signal or falsy value')

  const self = (...args) => {
    if (args.length === 0) return self.value
    else throw new TypeError('read-only signal')
  }

  self.fn = fn // link production/body
  self.inputs = inputs
  self.dependent = []

  // Append self to dependent list of all input signals:
  inputs.forEach(input => input.dependent.push(self))
  stack.push(self); process()
  return Signal(self)
})

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
  let signal, effect
  const isLinked = () => signal && effect
  const unlink = () => {
    if (isFunction(signal.dispose)) signal.dispose()
    const index = signal.dependent.indexOf(effect)
    signal.dependent = signal.dependent.splice(index)
  }

  const self = Signal.of()
  Signal.link(s => {
    if (isLinked()) unlink()
    signal = fn(s) // last :: Signal
    effect = Signal.isSignal(signal) && Signal.link(self, signal)
  }, [sa])
  return self
})

/**
 * startWith :: Signal s => a -> s a -> s a
 * startWith :: Signal s => (() -> a) -> s a -> s a
 */
Signal.startWith = curry((initial, signal) => {
  const value = isFunction(initial) ? initial() : initial
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
 * flyd compatibility
 */
Signal.merge = curry((a, b) => {
  const self = Signal.of()
  Signal.link(self, a)
  Signal.link(self, b)
  return self
})

/**
 * Set signal value.
 */
const set = curry((signal, value) => {
  if (value === undefined) {
    signal.dirty = false
  } else {
    const pointer = stack.length()
    signal.value = value
    signal.dirty = true
    dependent(signal).reverse().forEach(stack.push)
    process(pointer)
    return signal
  }
})

/**
 * evaluate :: Signal a -> Signal a
 * Evaluate linked signal.
 */
const evaluate = signal => {
  const dirty = x => x.dirty === undefined || x.dirty
  const dirtyInputs = signal => signal.inputs.some(dirty)
  const values = signal => signal.inputs.map(s => s.value)
  const apply = fn => xs => fn(...xs)
  const update = compose(set(signal), apply(signal.fn), values)
  const include = Signal.isDefined(signal.inputs) && dirtyInputs(signal)
  return include ? update(signal) : signal
}

/**
 * process :: (Number | 0) -> Unit
 * Process evaluation stack top down to designated
 * target index (pointer), then stop and return control.
 */
const process = (pointer = 0) => {
  while ((stack.length() !== pointer)) evaluate(stack.pop())
}

/**
 * dependent :: Signal s => s -> ([s] | []) -> [s]
 * Recursively get all dependent of signal in breadth-first order.
 */
const dependent = (signal, acc = []) =>
  signal.dependent.reduce((acc, x) => {
    acc.push(x)
    return dependent(x, acc)
  }, acc)

/**
 * isSignal :: any -> Boolean
 */
Signal.isSignal =
  x => x &&
  x.constructor === Signal

/**
 * isDefined :: Signal -> Boolean
 * isDefined :: [Signal] -> Boolean
 * Whether argument's value or values are defined.
 */
Signal.isDefined = x => Array.isArray(x)
  ? x.every(Signal.isDefined)
  : x.value !== undefined
