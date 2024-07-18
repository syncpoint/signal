import assert from 'assert'
import * as R from 'ramda'
import { describe, it } from 'mocha'
import { Signal as Wrapper } from 'signal-polyfill'

const curry = fn => function rec (...args) {
  return args.length >= fn.length
    ? fn(...args)
    : (...xs) => rec(...args, ...xs)
}

/**
 * isDefined :: Signal s => s -> boolean
 * isDefined :: Signal s => [s] -> boolean
 */
const isDefined = s =>
  Array.isArray(s)
    ? s.every(isDefined)
    : s() !== undefined

/**
 * wrap :: (State t | Computed t) -> () -> t
 * wrap :: (State t | Computed t) -> (T) -> Unit
 */
const wrap = s => {
  const atom = (...args) => {
    if (args.length === 0) return s.get()
    else if (args.length === 1) return args[0] === undefined ? atom : s.set(args[0])
    else atom
  }

  atom.wrapped = s
  return atom
}

const Signal = atom => {
  atom.constructor = Signal
  atom['fantasy-land/map'] = atom.map = fn => Signal.map(fn, atom)
  atom['fantasy-land/filter'] = atom.filter = fn => Signal.filter(fn, atom)
  // atom['fantasy-land/ap'] = atom.ap = sfn => Signal.ap(sfn, atom)
  // atom['fantasy-land/chain'] = atom.chain = fn => chain(fn, atom)
  return atom
}

/**
 * link :: Signal s => (a -> b) -> s a -> s b
 * link :: Signal s => (...[any] -> b) -> [s any] -> s b
 */
Signal.link = curry((fn, inputs) => {
  inputs = Array.isArray(inputs) ? inputs : [inputs]
  const atom = wrap(new Wrapper.Computed(() =>
    isDefined(inputs)
      ? fn(...inputs.map(s => s()))
      : undefined
  ))
  return Signal(atom)
})

/**
 * of :: Signal s => () -> s (* undefined Signal)
 * of :: Signal s => t -> s
 */
Signal.of = value => {
  const atom = wrap(new Wrapper.State(value))
  return Signal(atom)
}

/**
 * map :: Signal s => (a -> b) -> s a -> s b
 */
Signal.map = curry((fn, signal) =>
  Signal.link(a => fn(a), signal)
)

/**
 * filter :: Signal s => (a -> boolean) -> s a -> s a
 */
Signal.filter = curry((fn, signal) => {
  const self = Signal.of()
  Signal.link(a => fn(a) && self(a), signal)
  return self
})

/**
 * scan :: Signal s => (b -> a -> b) -> b -> s a -> s b
 */
Signal.scan = curry((fn, acc, signal) =>
  Signal.link(x => (acc = fn(acc, x)), signal)
)


describe('polyfill', function () {

  it('input signal without value', function () {

    // Create signal without value; no further processing.

    const a = Signal.of()
    assert.strictEqual(a(), undefined)
  })

  it('input signal with value', function () {

    // Create signal with value; no further processing.

    const a = Signal.of(1)
    assert.strictEqual(a(), 1)
  })

  describe('evaluate linked signal on construction', function () {

    // Eagerly evalute linked signal on construction;
    // no further processing.
    // a. all sources are defined: call production with source values
    // b. else: linked signal remains undefined

    it('one undefined source', function () {
      const a = Signal.of()
      const b = Signal.link(R.add(1), a)
      assert.strictEqual(b(), undefined)
    })

    it('one defined source', function () {
      const a = Signal.of(1)
      const b = Signal.link(R.add(2), a)
      assert.strictEqual(b(), 3)
    })

    it('two defined sources', function () {
      const a = Signal.of(1)
      const b = Signal.of(2)
      const c = Signal.link(R.add, [a, b])
      assert.strictEqual(c(), 3)
    })
  })

  describe('update input signal without sinks', function () {

    // Set value of input signal without sinks;
    // no further processing without sinks.
    // a. new value is undefined: no-op (undefined is not a valid value)
    // b. new value equals current value (Object.is): no-op
    // c. else: update signal value to new value

    it('undefined value', function () {
      const a = Signal.of(1)
      a(undefined); assert.strictEqual(a(), 1)
    })

    it('same value (no observable side-effects)', function () {
      const a = Signal.of(1)
      a(1); assert.strictEqual(a(), 1)
    })

    it('different value', function () {
      const a = Signal.of(1)
      a(2); assert.strictEqual(a(), 2)
    })
  })

  it('update simple signal with sinks (linear graph)', function () {
    const a = Signal.of(1)
    const b = Signal.link(R.add(1), a)
    const c = Signal.link(R.add(1), b)
    assert.strictEqual(c(), 3)
    a(2); assert.strictEqual(c(), 4)
  })

  it('update simple signal with sinks (diamond)', function () {
    const a = Signal.of(1)
    const b = Signal.link(R.add(1), a)
    const c = Signal.link(R.add(2), a)
    const d = Signal.link((b, c) => b * c, [b, c])
    assert.strictEqual(d(), 6)
    a(2); assert.strictEqual(d(), 12)
  })

  describe('Fantasy Land', function () {
    it('[2d75] map :: Signal s => (a -> b) -> s a -> s b', function () {
      const a = Signal.of()
      const b = R.map(x => x * 2, a)
      assert.strictEqual(b(), undefined)
      a(1); assert.strictEqual(b(), 2)
      a(2); assert.strictEqual(b(), 4)
    })

    it('[af73] map :: Signal s => (a -> b) -> s a -> s b', function () {
      const a = Signal.of(1)
        .map(x => x * 2)
        .map(x => x + 1)

      assert.strictEqual(a(), 3)
    })

    // it('[ddba] filter :: Signal s => (a -> boolean) -> s a -> s a', function () {
    //   const a = Signal.of()
    //   const b = R.filter(x => x % 2 === 0, a)
    //   const actual = recorder(b)
    //   ;[2, 3, 4].forEach(a)
    //   assert.deepStrictEqual(actual(), ['2', '4'])
    // })

    // it('[4982] reject :: Signal s => (a -> boolean) -> s a -> s a', function () {
    //   const a = Signal.of()
    //   const b = R.reject(x => x % 2 === 0, a)
    //   const actual = recorder(b)
    //   ;[1, 2, 3, 4].forEach(a)
    //   assert.deepStrictEqual(actual(), ['1', '3'])
    // })
  })

  describe.skip('miscellaneous operators', function () {
    it('[5450] scan :: Signal s => (b -> a -> b) -> b -> s a -> s b', function () {
      const a = Signal.of()
      const b = Signal.scan(R.add, 0, a)
      R.range(0, 10).forEach(a)
      assert.strictEqual(b(), 45)
    })
  })
})
