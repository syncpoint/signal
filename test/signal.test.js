import assert from 'node:assert'
import { describe, it } from 'mocha'
import Signal from '../lib/index.js'
import sleep from './sleep.js'
import recorder from './recorder.js'
import hasValue from './hasValue.js'
import diamond from './diamond.js'
import expectError from './expectError.js'

describe('Interface Specification', function () {

  ;[
    ['8249/5c9d', undefined, 'Signal(undefined)'],
    ['8249/42e4', 1, 'Signal(1)'],
    ['8249/28bc', 'hello', 'Signal(hello)'],
    ['8249/414f', {}, 'Signal([object Object])'],
  ].forEach(([id, value, expected]) => {
    it(`[${id}] toString() :: Signal s => s -> String`, function() {
      const a = Signal.of(value)
      assert.deepEqual(a.toString(), expected)
    })
  })

  it('[4ddf] toString() :: Signal s => s -> String', function () {
    const a = Signal.of(0, { label: 'a' })
    assert.strictEqual(a.toString(), 'Signal[a](0)')
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

  it('[0ce9] deferred :: Signal s => v -> s v', async function () {
    const expected = 3
    const s = Signal.deferred(expected)
    await sleep()
    assert.strictEqual(s(), expected)
  })

  it('[4e40] deferred :: Signal s => () -> v -> s v', async function () {
    const expected = 3
    const s = Signal.deferred(() => expected)
    await sleep()
    assert.strictEqual(s(), expected)
  })

  it('[95ad] deferred :: Signal s, Promise p => p v -> s v', async function () {
    const expected = 3
    const s = Signal.deferred(Promise.resolve(3))
    await sleep()
    assert.strictEqual(s(), expected)
  })

  it('[4308] deferred :: Signal s, Promise p => () -> p v -> s v', async function () {
    const expected = 3
    const s = Signal.deferred(() => Promise.resolve(3))
    await sleep()
    assert.strictEqual(s(), expected)
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
        expectError(() => Signal.link(fn, inputs), message)
      })
    })
  })

  describe('link :: Signal s => (...[any] -> b) -> [s any] -> s b', function () {
    it('read-only', function () {
      const input = Signal.of(1)
      const output = Signal.link(a => a + 1, input)
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
        const b = Signal.link(a => a + 1, [a])
        const c = Signal.link(a => a + 2, [a])
        const d = Signal.link((b, c) => b * c, [b, c])
        const actual = recorder(d)
        a(2)
        assert.deepStrictEqual(actual(), expected)
      })
    })

    it('[7a82] Evaluation count/set [diamond/extended]', function () {
      // Verify topological sort/order works as expected.
      const a = Signal.of()
      const b = Signal.link(a => a + 1, [a])
      const c = Signal.link(a => a + 2, [a])
      const d = Signal.link(c => c + 3, [c])
      const e = Signal.link((b, d) => b + d, [b, d])
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
        const output = Signal.link(fn, inputs)
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
        const output = Signal.link(fn, inputs)
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
      Signal.link(push('A'), input)
      Signal.link(push('B'), input)
      Signal.link(push('C'), input)

      input(2)
      const expected = [
        'A:1', 'B:1', 'C:1',
        'A:2', 'B:2', 'C:2'
      ]

      assert.deepStrictEqual(actual, expected)
    })
  })
})
