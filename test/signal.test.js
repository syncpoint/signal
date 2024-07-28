import assert from 'assert'
import { describe, it } from 'mocha'
import * as R from 'ramda'
import Signal from '../lib/index.js'

const {
  isSignal,
  link, chain, startWith, scan, tap, loop, lift,
  fromListeners
} = Signal

const hasValue = (x, v) =>
  isSignal(x) && x() === v

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

const recorder = inputs => {
  const acc = []
  link((...values) => acc.push(values.join(':')), inputs)
  return () => acc
}

describe('Interface Specification', function () {

  it('label :: Signal s => s -> String', function () {
    const a = Signal.of()
    assert.strictEqual(Signal.label(a), undefined)
  })

  it('label :: Signal s => s -> String -> Unit', function () {
    const a = Signal.of()
    const expected = 'abc'
    Signal.label(a, expected)
    assert.strictEqual(Signal.label(a), expected)
  })

  ;[
    ['8249/5c9d', undefined, 'Signal(undefined)'],
    ['8249/42e4', 1, 'Signal(1)'],
    ['8249/28bc', 'hello', 'Signal(hello)'],
    ['8249/414f', {}, 'Signal([object Object])'],
  ].forEach(([id, value, expected]) => {
    it.skip(`[${id}] toString() :: Signal s => s -> string`, function() {
      const a = Signal.of(value)
      assert.deepEqual(a.toString(), expected)
    })
  })

  it('[8a4a] toJSON :: Signal s -> JSON', function() {
    const object = {
      num: Signal.of(23),
      str: Signal.of('string'),
      obj: Signal.of({ is_object: true })
    }

    const expected = {
      num: 23,
      str: 'string',
      obj: {
        is_object: true
      }
    }

    const actual = JSON.parse(JSON.stringify(object))
    assert.deepEqual(actual, expected)
  })

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
    assert.strictEqual(s(), undefined)
  })

  ;[
    ['d25b/4edd', 'null', null],
    ['d25b/846d', 'number', 0],
    ['d25b/e268', 'string', 'x'],
    ['d25b/4c73', 'boolean', true],
    ['d25b/9bd6', 'function', x => x],
    ['d25b/56a9', 'object', { key: 'value ' }]
  ].forEach(([id, label, v]) => {
    // Updating signal with undefined is a no-op.
    it(`[${id}] set :: Signal s => ${label} -> undefined -> s ${label}`, function () {
      const s = Signal.of(v)
      s(undefined)
      assert.strictEqual(s(), v)
    })
  })

  ;[
    ['475c/448c', undefined, null],
    ['475c/b52f', undefined, 1],
    ['475c/d329', null, 1],
    ['475c/44e8', 1, null],
    ['475c/9f4a', 1, 2]
  ].forEach(([id, a, b]) => {
    it(`[${id}] set :: Signal s => ${a} -> ${b} -> s ${b}`, function () {
      const s = Signal.of(a)
      s(b)
      assert.strictEqual(s(), b)
    })
  })

  it('[b420] set :: Signal s => () -> s', function() {
    const expected = Signal.of()
    const actual = expected(23)
    assert.strictEqual(actual, expected)
  });


  it('on :: Signal s => (a -> *) -> s a -> (() -> Unit)', function () {
    const acc = []
    const push = x => acc.push(x)
    const a = Signal.of(2)
    const dispose = a.on(push)
    a(3); dispose()
    a(4); a(5) // ignored after disposing effect.
    assert.deepStrictEqual(acc, [2, 3])
  })

  describe('[TypeError] link :: Signal s => (...[any] -> b) -> [s any] -> s b', function () {
    [
      [undefined, undefined, '"fn" is undefined'],
      [x => x, undefined, '"inputs" is empty array'],
      [x => x, 'x', '"inputs" contains non-signal or falsy value'],
      [x => x, [], '"inputs" is empty array'],
      [x => x, ['x'], '"inputs" contains non-signal or falsy value'],
      [x => x, [null], '"inputs" is empty array'],
      [x => x, [undefined], '"inputs" is empty array']
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
      ['1-ary', [undefined], []],
      ['1-ary', [1], ['1']],
      ['1-ary', 1, ['1']], // single signal, no array
      ['2-ary', [undefined, undefined], []],
      ['2-ary', [1, undefined], []],
      ['2-ary', [1, 2], ['1:2']]
    ].forEach(([label, values, expected]) => {
      // Check production is only evaluated when all inputs are defined.
      it(`Evaluation count/of (${label}) (${values})`, function () {
        const inputs = Array.isArray(values) ? values.map(Signal.of) : Signal.of(values)
        const actual = recorder(inputs)
        assert.deepStrictEqual(actual(), expected)
      })
    })

    ;[
      ['1-ary', [undefined], [0], ['0']],
      // ['1-ary', [1], [1], ['1', '1']],
      ['1-ary', [1], [2], ['1', '2']],
      ['2-ary', [undefined, undefined], [1, undefined], []],
      ['2-ary', [undefined, undefined], [1, 2], ['1:2']],
      // ['2-ary', [1, 2], [1, 2], ['1:2', '1:2', '1:2']],
      // ['2-ary', [1, 2], [1, 3], ['1:2', '1:2', '1:3']],
      ['2-ary', [1, 2], [2, 3], ['1:2', '2:2', '2:3']]
    ].forEach(([label, initial, next, expected]) => {
      // Check production is only evaluated when at least on input changed.
      const format = x => x === undefined ? 'undefined' : x
      it(`Evaluation count/set (${label}) (${initial.map(format)}) <- (${next.map(format)})`, function () {
        const inputs = initial.map(Signal.of)
        const actual = recorder(inputs)
        next.forEach((value, i) => inputs[i](value))
        assert.deepStrictEqual(actual(), expected)
      })
    })

    ;[
      [undefined, ['12']],
      [1, ['6', '12']]
    ].forEach(([initial, expected]) => {
      it(`Evaluation count/set [diamond] (${initial})`, function () {
        const a = Signal.of(initial)
        const b = link(a => a + 1, [a])
        const c = link(a => a + 2, [a])
        const d = link((b, c) => b * c, [b, c])
        const actual = recorder(d)
        a(2)
        assert.deepStrictEqual(actual(), expected)
      })
    })

    it('[7a82] Evaluation count/set [diamond/extended]', function () {
      // Verify topological sort/order works as expected.
      const a = Signal.of()
      const b = link(a => a + 1, [a])
      const c = link(a => a + 2, [a])
      const d = link(c => c + 3, [c])
      const e = link((b, d) => b + d, [b, d])
      const actual = recorder(e)
      ;[1, 5, 11].forEach(a)
      assert.deepStrictEqual(actual(), ['8', '16', '28'])
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
    it('[a5a6] evaluation order', function () {
      const actual = []
      const push = label => x => actual.push(`${label}:${x}`)
      const input = Signal.of(1)
      link(push('A'), [input])
      const output = link(a => {
        push('B')(a)
        const inner = Signal.of(a + 1)
        link(push('D'), [inner])
        inner(a + 2)
        push('C')(a)
        return inner()
      }, [input])

      link(push('E'), [input])
      const expected = ['A:1', 'B:1', 'D:2', 'D:3', 'C:1', 'E:1']
      assert.deepStrictEqual(actual, expected)
      assert.strictEqual(output(), 3)
    })

    it('[4ed9] atomic update: plain signal', function () {
      const input = Signal.of(1)
      const output = link(x => Signal.of(x)(), [input])

      assert.strictEqual(input(), 1, 'input: unexpected value')
      assert.strictEqual(output(), 1, 'output: unexpected value')
    })

    it('[bd07] atomic update: linked signal', function () {
      const input = Signal.of(1)
      const output = link(x => link(a => a + 1, [Signal.of(x)])(), [input])
      assert.strictEqual(output(), 2)
    })

    it('[b24e] nested read', function () {
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
      const b = link(a => a + 1, [a])
      const c = link((a, b) => a * b, [a, b])
      a(2); assert.strictEqual(c(), 6)
    })

    it('[4654] nested write', function () {
      const a = Signal.of(1) // immediately overwritten by 2
      const b = Signal.of()
      link(a, [b]) // [L1] aka link(b => a(b), b)
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

    it('filter :: Signal s => (a -> boolean) -> s a -> s a', function () {
      const a = Signal.of()
      const b = R.filter(x => x % 2 === 0, a)
      const actual = recorder(b)
      ;[2, 3, 4].forEach(a)
      assert.deepStrictEqual(actual(), ['2', '4'])
    })

    it('reject :: Signal s => (a -> boolean) -> s a -> s a', function () {
      const a = Signal.of()
      const b = R.reject(x => x % 2 === 0, a)
      const actual = recorder(b)
      ;[1, 2, 3, 4].forEach(a)
      assert.deepStrictEqual(actual(), ['1', '3'])
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
      const input = Signal.of()
      const output = input.chain(() => R.tap(s => [42].forEach(s), Signal.of()))
      const actual = recorder(output)
      input('go!'); assert.deepStrictEqual(actual(), ['42'])
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

  describe('transducer [Ramda]', function () {
    it('map', function () {
      const xf = R.map(R.multiply(2))
      const a = Signal.of()
      const b = Signal.transduce(xf, a)
      const c = Signal.scan(R.flip(R.append), [], b)
      ;[1, 2, 4].map(a)
      assert.deepStrictEqual(c(), [2, 4, 8])
    })

    it('drop', function () {
      const xf = R.drop(3)
      const a = Signal.of()
      const b = Signal.transduce(xf, a)
      const c = Signal.scan(R.flip(R.append), [], b)
      R.range(1, 7).map(a)
      assert.deepStrictEqual(c(), [4, 5, 6])
    })

    it('compose', function () {
      // Note: compose in context of transduce is
      // evaluated left to right!
      const xf = R.compose(
        R.map(R.add(-1)),
        R.filter(x => x % 2 === 0),
        R.map(R.multiply(3))
      )

      const a = Signal.of()
      const b = Signal.transduce(xf, a)
      const c = Signal.scan(R.flip(R.append), [], b)
      ;[4, 1, -3, 8, 7].map(a)
      assert.deepStrictEqual(c(), [0, -12, 18])
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

    it('merge :: Signal s => s a -> s b -> s (a | b)', function () {
      const a = Signal.of()
      const b = Signal.of()
      const c = Signal.merge(a, b)
      const d = scan(R.flip(R.append), [], c)
      assert.strictEqual(d(), undefined)

      a(1); b('2'); b('3'); a(4); b('5')
      assert.deepStrictEqual(d(), [1, '2', '3', 4, '5'])
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

    ;[
      ['on/off', ['on', 'off']],
      ['add/remove', ['addEventListener', 'removeEventListener']]
    ].forEach(([hint, spec]) => {
      it(`fromListeners :: [String] -> Element -> Signal Event [${hint}]`, async function () {
        const acc = []

        const emitter = ([on, off], id) => {
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
            [on]: addEventListener,
            [off]: removeEventListener,
            emit
          }
        }

        const emitters = R.range(0, 3).reduce((acc, i) => {
          acc[i] = emitter(spec, i)
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
})

describe('Behavior', function () {
  it('Signal should only update on changed value', function () {
    let called = 0
    const a = Signal.of()
    const b = a.map(a => { called++; return a + 1 })
    assert.strictEqual(called, 0)
    a(1); assert.strictEqual(called, 1)
    a(1); assert.strictEqual(called, 1)
  })

  it('Effect (direct) should only be called on changed value', function () {
    let called = 0
    const a = Signal.of()
    a.on(() => called++)
    assert.strictEqual(called, 0)
    a(1); assert.strictEqual(called, 1)
    a(1); assert.strictEqual(called, 1)
  })

  it('Effect (indirect) should only be called on changed value', function () {
    let called = 0
    const a = Signal.of()
    const b = a.map(a => a % 2)
    b.on(() => called++)
    a(2); assert.strictEqual(called, 1)
    a(4); assert.strictEqual(called, 1)
  })

  describe('"equals" option', function () {
    it('of (modulo)', function () {
      const a = Signal.of(0, { equals: (a, b) => (a % 2) === (b % 2) })
      const b = Signal.scan(R.flip(R.append), [], a)
      ;[5, 3, 10, 0].map(a)
      assert.deepStrictEqual(b(), [0, 5, 10])
    })

    it('of (distance)', function () {
      // Consider to consecutive values as equal when their
      // abolute difference (distance) is smaller than epsilon.
      const epsilon = 0.2
      const a = Signal.of(0, { equals: (a, b) => Math.abs(a - b) < epsilon })
      const b =  Signal.scan(R.flip(R.append), [], a)
      ;[4, 4.1, 4.15, 4.5].map(a)
      assert.deepStrictEqual(b(), [0, 4, 4.5])
    })

    it('link', function () {
      // Consider two consecutive strings to be equal when their
      // absolute difference in length is smaller than delta.
      const delta = 4
      const equals = (a, b) => Math.abs(a.length - b.length ) < delta
      const a = Signal.of('A')
      const b = Signal.of('B')
      const c = Signal.link(R.concat, [a, b], { equals })
      a('AA'); assert.strictEqual(c(), 'AB')
      b('BBBB') ; assert.strictEqual(c(), 'AABBBB')
      b('BB') ; assert.strictEqual(c(), 'AABBBB')
      a(''); assert.strictEqual(c(), 'BB')
    })
  })
})
