import assert from 'assert'
import { describe, it } from 'mocha'
import * as R from 'ramda'
import Signal from '../lib/signal'

const {
  isDefined, isSignal,
  link, chain, startWith, scan, tap, loop, lift,
  fromListeners
} = Signal

const hasValue = (x, v) =>
  isSignal(x) && isDefined(x) && x() === v

const diamond = (fn, input) => link(fn, [
  link(a => a + 1, input),
  link(a => a + 2, input)
])

const expectError = (fn, message) => {
  try {
    fn()
    assert.fail('expected error not raised')
  } catch (err) {
    assert.strictEqual(err.message, message)
  }
}

const counter = () => {
  let counter = 0
  const inc = () => (counter += 1)
  inc.actual = () => counter
  return inc
}

describe('Interface Specification', function () {
  ;[
    ['null', null],
    ['number', 0, 42],
    ['string', '', 'x'],
    ['boolean', false, true],
    ['function', () => {}, x => x],
    ['object', {}, { key: 'value ' }]
  ].forEach(([type, ...values]) => {
    // Create signal from value other than undefined.
    it(`of :: Signal s, v ${type} => v -> s v`, function () {
      values.forEach(value => {
        assert(hasValue(Signal.of(value), value))
      })
    })
  })

  it('of :: Signal s, v undefined => v -> s v', function () {
    // Value of undefined signal is `undefined`.
    const s = Signal.of(undefined)
    assert(!isDefined(s))
    assert.strictEqual(s(), undefined)
  })

  ;[
    ['null', null],
    ['number', 0],
    ['string', 'x'],
    ['boolean', true],
    ['function', x => x],
    ['object', { key: 'value ' }]
  ].forEach(([label, v]) => {
    // Updating signal with undefined is a no-op.
    it(`set :: Signal s => ${label} -> undefined -> s ${label}`, function () {
      const s = Signal.of(v)
      s(undefined)
      assert.strictEqual(s(), v)
    })
  })

  ;[
    [undefined, null],
    [undefined, 1],
    [null, 1],
    [1, null],
    [1, 2]
  ].forEach(([a, b]) => {
    it(`set :: Signal s => ${a} -> ${b} -> s ${b}`, function () {
      const s = Signal.of(a)
      s(b)
      assert.strictEqual(s(), b)
    })
  })

  describe('[TypeError] link :: Signal s => (...[any] -> b) -> [s any] -> s b', function () {
    [
      [undefined, undefined, '"fn" is undefined'],
      [x => x, undefined, '"inputs" is undefined'],
      [x => x, 'x', '"inputs" is not an array'],
      [x => x, [], '"inputs" is empty array'],
      [x => x, ['x'], '"inputs" contains non-signal or falsy value'],
      [x => x, [null], '"inputs" contains non-signal or falsy value'],
      [x => x, [undefined], '"inputs" contains non-signal or falsy value']
    ].forEach(([fn, inputs, message]) => {
      it(`TypeError: ${message}`, function () {
        expectError(() => link(fn, inputs), message)
      })
    })
  })

  describe('link :: Signal s => (...[any] -> b) -> [s any] -> s b', function () {
    it('read-only', function () {
      const input = Signal.of(1)
      const output = link(a => a + 1, input)
      expectError(() => output(3), 'read-only signal')
    })

    ;[
      ['1-ary', [undefined], 0],
      ['1-ary', [1], 1],
      ['1-ary', 1, 1], // single signal, no array
      ['2-ary', [undefined, undefined], 0],
      ['2-ary', [1, undefined], 0],
      ['2-ary', [1, 2], 1]
    ].forEach(([label, values, expected]) => {
      // Check production is only evaluated when all inputs are defined.
      it(`Evaluation count/of (${label}) (${values})`, function () {
        const inputs = Array.isArray(values) ? values.map(Signal.of) : Signal.of(values)
        const count = counter()
        link(count, inputs)
        assert.strictEqual(count.actual(), expected)
      })
    })

    ;[
      ['1-ary', [undefined], [0], 1],
      ['1-ary', [1], [1], 1],
      ['1-ary', [1], [2], 2],
      ['2-ary', [undefined, undefined], [1, undefined], 0],
      ['2-ary', [undefined, undefined], [1, 2], 1],
      ['2-ary', [1, 2], [1, 2], 1],
      ['2-ary', [1, 2], [1, 3], 2],
      ['2-ary', [1, 2], [2, 3], 3] // TODO: do we need batching for updates?
    ].forEach(([label, initial, next, expected]) => {
      // Check production is only evaluated when at least on input changed.
      const format = x => x === undefined ? 'undefined' : x
      it(`Evaluation count/set (${label}) (${initial.map(format)}) <- (${next.map(format)})`, function () {
        const count = counter()
        const inputs = initial.map(Signal.of) // 1
        link(count, inputs) // 2
        next.forEach((value, i) => inputs[i](value))
        assert.strictEqual(count.actual(), expected)
      })
    })

    ;[
      [undefined, 1],
      [1, 2]
    ].forEach(([initial, expected]) => {
      it(`Evaluation count/set [diamond] (${initial})`, function () {
        const count = counter()
        const input = Signal.of(initial)
        diamond(count, input)
        input(2); assert.strictEqual(count.actual(), expected)
      })
    })

    it('Evaluation count/set (1-ary) [indirect]', function () {
      // Check indirect link `c` is only evaluated when `b` changed.
      const count = counter()
      const a = Signal.of()
      const b = a.map(a => Math.ceil(a / 2), a)
      link(count, b)
      R.range(1, 7).forEach(a)
      assert.strictEqual(count.actual(), 3) // a ∈ (1, 3, 5)
    })

    it('Evaluation count/set (2-ary) [indirect]', function () {
      // Check indirect link `c` is only evaluated when `b` changed.
      const count = counter()
      const a = Signal.of(2)
      const b = Signal.of(5)
      const c = link((a, b) => Math.abs(a) + Math.abs(b), [a, b])
      link(count, c)
      a(-2); b(-5)
      assert.strictEqual(count.actual(), 1)
    })

    ;[
      ['1-ary', [1], a => a + 1, 2],
      ['1-ary', ['lower'], a => a.toUpperCase(), 'LOWER'],
      ['2-ary', [1, 2], (a, b) => a + b, 3]
    ].forEach(([label, initial, fn, expected]) => {
      it(`Evaluation value/of (${label}) (${initial})`, function () {
        const inputs = initial.map(Signal.of)
        const output = link(fn, inputs)
        assert.strictEqual(output(), expected)
      })
    })

    it('Evaluation value/of [diamond]', function () {
      const input = Signal.of(2)
      const output = diamond((a, b) => a + b, input)
      assert.strictEqual(output(), 7)
    })

    ;[
      ['1-ary', [1], [2], a => a + 1, 3],
      ['1-ary', ['lower'], ['upper'], a => a.toUpperCase(), 'UPPER'],
      ['2-ary', [1, 2], [3, 4], (a, b) => a + b, 7]
    ].forEach(([label, initial, next, fn, expected]) => {
      it(`Evaluation value/set (${label}) (${initial})`, function () {
        const inputs = initial.map(Signal.of)
        const output = link(fn, inputs)
        next.forEach((value, i) => inputs[i](value))
        assert.strictEqual(output(), expected)
      })
    })

    it('Evaluation value/set [diamond]', function () {
      const input = Signal.of(1)
      const output = diamond((a, b) => a + b, input)
      input(2); assert.strictEqual(output(), 7)
    })

    it('Evaluation order = definition order', function () {
      const actual = []
      const push = label => x => actual.push(`${label}:${x}`)
      const input = Signal.of(1)
      link(push('A'), input)
      link(push('B'), input)
      link(push('C'), input)

      input(2)
      const expected = [
        'A:1', 'B:1', 'C:1',
        'A:2', 'B:2', 'C:2'
      ]

      assert.deepStrictEqual(actual, expected)
    })
  })

  describe('nested signal', function () {
    it('evaluation order', function () {
      const actual = []
      const push = label => x => actual.push(`${label}:${x}`)
      const input = Signal.of(1)
      link(push('A'), input)
      const output = link(a => {
        push('B')(a)
        const inner = Signal.of(a + 1)
        link(push('D'), [inner])
        inner(a + 2)
        push('C')(a)
        return inner()
      }, input)

      link(push('E'), input)
      const expected = ['A:1', 'B:1', 'D:2', 'D:3', 'C:1', 'E:1']
      assert.deepStrictEqual(actual, expected)
      assert.strictEqual(output(), 3)
    })

    it('atomic update: plain signal', function () {
      const input = Signal.of(1)
      const output = link(x => Signal.of(x)(), input)

      assert.strictEqual(input(), 1, 'input: unexpected value')
      assert.strictEqual(output(), 1, 'output: unexpected value')
    })

    it('atomic update: linked signal', function () {
      const input = Signal.of(1)
      const output = link(x => link(a => a + 1, Signal.of(x))(), input)
      assert.strictEqual(output(), 2)
    })

    it('nested read', function () {
      const actual = []
      const flag = Signal.of(false)
      const a = Signal.of()
      const b = Signal.of()

      link(a => actual.push(`[2]:${a}:${flag()}`), [a])
      link(b => {
        actual.push(`[1]:${b}`)
        flag(true)
        a(2)
        actual.push('[3]')
        flag(false)
      }, [b])

      b(1)
      const expected = ['[1]:1', '[2]:2:true', '[3]']
      assert.deepStrictEqual(actual, expected)
    })

    it('[40c9] unnamed', function () {
      const a = Signal.of()
      const b = link(a => a + 1, a)
      const c = link((a, b) => a * b, [a, b])
      a(2); assert.strictEqual(c(), 6)
    })

    it('nested write', function () {
      const a = Signal.of(1) // immediately overwritten by 2
      const b = Signal.of()
      link(a, b) // [L1] aka link(b => a(b), b)
      const c = link((a, b) => a + b, [a, b]) // [L2]
      // L1 is executed before L2; thus L2 is only evaluated
      // once with a=2, b=2.
      b(2); assert.strictEqual(c(), 4)
    })
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

    it('filter :: Signal s => (a -> Boolean) -> s a -> s a', function () {
      const a = Signal.of()
      const b = R.filter(x => x % 2 === 0, a)

      const actual = []
      link(x => actual.push(x), [b])
      ;[2, 3, 4].forEach(a)
      assert.deepStrictEqual(actual, [2, 4])
    })

    it('reject :: Signal s => (a -> Boolean) -> s a -> s a', function () {
      const a = Signal.of()
      const b = R.reject(x => x % 2 === 0, a)

      const actual = []
      link(x => actual.push(x), [b])
      ;[1, 2, 3, 4].forEach(a)
      assert.deepStrictEqual(actual, [1, 3])
    })

    it('ap :: Signal s => s (a -> b) -> s a -> s b', function () {
      const a = Signal.of()
      const fn = Signal.of(x => x + 1)
      const b = R.ap(fn, a)
      assert.strictEqual(b(), undefined)
      a(1); assert.strictEqual(b(), 2)
      fn(x => x * 3); assert.strictEqual(b(), 3)
      a(2); assert.strictEqual(b(), 6)
    })

    it('[3646] chain :: Signal s => (a -> s b) -> s a -> s b', async function () {
      const expected = [42]
      const input = Signal.of()
      const output = input.chain(() => R.tap(s => expected.forEach(s), Signal.of()))

      const actual = []
      link(x => actual.push(x), [output])
      input('go!'); assert.deepStrictEqual(actual, expected)
    })

    it('[4ae4] chain :: Signal s => (a -> s b) -> s a -> s b', async function () {
      const expected = 42
      const main = Signal.of(expected)
      const output = main.chain(v => Signal.of(v))
      assert.deepStrictEqual(output(), expected)
    })

    it('[9cc4] chain :: Signal s => (a -> s b) -> s a -> s b', async function () {
      // Preserve ordering.
      const input = Signal.of()
      const a = Signal.of()
      const b = Signal.of()
      const c = Signal.of()
      const output = input.chain(R.identity)

      const actual = await new Promise(resolve => {
        const acc = []
        const push = x => acc.push(x)
        link(push, output)

        const ticks = [
          () => input(a), () => a(1), () => a(2), () => a(3),
          () => input(b), () => b(4), () => b(5), () => b(6),
          () => input(c), () => c(7), () => c(8), () => c(9),
          () => input(null)
        ]

        const timer = setInterval(() => {
          if (ticks.length) return ticks.shift()()
          clearInterval(timer)
          resolve(acc)
        }, 0)
      })

      const expected = R.range(1, 10)
      assert.deepStrictEqual(actual, expected)
    })
  })

  describe('miscellaneous operators', function () {
    it('[ae26] startWith :: Signal s => a -> s a -> s a', function () {
      // Initial value if signal is undefined.
      const a = Signal.of()
      const b = startWith(0, a)
      assert.strictEqual(b(), 0)
      a(1); assert.strictEqual(b(), 1)
    })

    it('[46de] startWith :: Signal s => (() -> a) -> s a -> s a', function () {
      // Initial value (from function) if signal is undefined.
      const a = Signal.of()
      const b = startWith(() => 0, a)
      assert.strictEqual(b(), 0)
      a(1); assert.strictEqual(b(), 1)
    })

    it('[46de] startWith :: Signal s => a -> s a -> s a', function () {
      // Initial value for linked signal.
      const a = Signal.of()
      const b = link(a => a + 1, [a])
      const c = startWith(0, b)
      assert.strictEqual(c(), 0)
      a(1); assert.strictEqual(c(), 2)
    })

    it('[b308] startWith :: Signal s => a -> s a -> s a', function () {
      // Initial value is ignored if signal is defined.
      const a = Signal.of(1)
      const b = startWith(0, a)
      assert.strictEqual(b(), 1)
      a(2); assert.strictEqual(b(), 2)
    })

    it('scan :: Signal s => (b -> a -> b) -> b -> s a -> s b', function () {
      const a = Signal.of()
      const b = scan((acc, a) => acc + a, 0, a)
      R.range(0, 10).forEach(a)
      assert.strictEqual(b(), 45)
    })

    it('tap :: Signal s => (a -> any) -> s a -> s a', function () {
      let actual = 0
      const a = Signal.of()
      const b = tap(a => (actual += a), a)
      R.range(0, 10).forEach(a)
      assert.strictEqual(actual, 45)
      assert.strictEqual(b(), 9)
    })

    it('loop :: Signal s => (b -> a -> [b, c]) -> b -> s a -> s c', function () {
      const average = xs => xs.reduce((a, b) => a + b) / xs.length
      const a = Signal.of()
      const b = loop((xs, x) => {
        xs.push(x); xs = xs.slice(-10)
        return [xs, average(xs)]
      }, [], a)
      R.range(0, 20).forEach(a)
      assert.strictEqual(b(), 14.5) // sum(10..19) / 10
    })

    it('lift :: Signal s => ((a -> b -> ...) -> x) -> s a -> s b -> ... -> s x', function () {
      const a = Signal.of()
      const b = Signal.of()
      const c = lift((a, b) => a + b, a, b)
      a(1); b(2); assert.strictEqual(c(), 3)
      a(3); assert.strictEqual(c(), 5)
      b(1); assert.strictEqual(c(), 4)
    })

    it('fromListeners :: [String] -> Element -> Signal Event', async function () {
      const acc = []

      const emitter = id => {
        let listener_
        const addEventListener = (type, listener) => {
          acc.push(`+:${id}`)
          listener_ = listener
        }
        const removeEventListener = (type, listener) => {
          acc.push(`-:${id}`)
          listener_ = null
        }
        const emit = n => listener_ && listener_(`${id}:${n}`)
        return {
          addEventListener,
          removeEventListener,
          emit
        }
      }

      const emitters = R.range(0, 3).reduce((acc, i) => {
        acc[i] = emitter(i)
        return acc
      }, {})

      const input = Signal.of()
      const output = chain(x => {
        return emitters[x] && fromListeners(['event'], emitters[x])
      }, input)

      const actual = await new Promise(resolve => {
        const ticks = [
          () => input(0), () => emitters[0].emit(0), () => emitters[0].emit(1), () => emitters[0].emit(2),
          () => input(1), () => emitters[1].emit(0), () => emitters[1].emit(1), () => emitters[1].emit(2),
          () => input(2), () => emitters[2].emit(0), () => emitters[2].emit(1), () => emitters[2].emit(2),
          () => input(null)
        ]

        const timer = setInterval(() => {
          if (ticks.length) return ticks.shift()()
          clearInterval(timer)
          resolve(acc)
        }, 0)

        link(x => acc.push(x), output)
      })

      const expected = [
        '+:0', '0:0', '0:1', '0:2', '-:0',
        '+:1', '1:0', '1:1', '1:2', '-:1',
        '+:2', '2:0', '2:1', '2:2', '-:2'
      ]

      assert.deepStrictEqual(actual, expected)
    })
  })
})
