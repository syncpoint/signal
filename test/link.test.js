import assert from 'node:assert'
import * as R from 'ramda'
import { describe, it } from 'mocha'
import Signal from '../lib/index.js'
import recorder from './_recorder.js'
import diamond from './_diamond.js'
import expectError from './_expectError.js'

describe('Signal.link', function () {
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

  it('update simple value with sinks (linear graph)', function () {
    const a = Signal.of(1)
    const b = Signal.link(R.add(1), a)
    const c = Signal.link(R.add(1), b)
    assert.strictEqual(c(), 3)
    a(2); assert.strictEqual(c(), 4)
  })

  it('update simple value with sinks (diamond)', function () {
    const a = Signal.of(1)
    const b = Signal.link(R.add(1), a)
    const c = Signal.link(R.add(2), a)
    const d = Signal.link((b, c) => b * c, [b, c])
    assert.strictEqual(d(), 6)
    a(2); assert.strictEqual(d(), 12)
  })

  describe('"equals" option', function () {
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

  describe('"label" option', function () {
    it('link', function () {
      const a = Signal.of()
      const b = Signal.link(a => a + 1, [a], { label: 'b' })
      assert.deepStrictEqual(b.__label, 'b')
    })
  })

  describe('nested signal', function () {
    it('[a5a6] evaluation order', function () {
      const actual = []
      const push = label => x => actual.push(`${label}:${x}`)
      const input = Signal.of(1)
      Signal.link(push('A'), [input])
      const output = Signal.link(a => {
        push('B')(a)
        const inner = Signal.of(a + 1)
        Signal.link(push('D'), [inner])
        inner(a + 2)
        push('C')(a)
        return inner()
      }, [input])

      Signal.link(push('E'), [input])
      const expected = ['A:1', 'B:1', 'D:2', 'D:3', 'C:1', 'E:1']
      assert.deepStrictEqual(actual, expected)
      assert.strictEqual(output(), 3)
    })

    it('[4ed9] atomic update: plain signal', function () {
      const input = Signal.of(1)
      const output = Signal.link(x => Signal.of(x)(), [input])

      assert.strictEqual(input(), 1, 'input: unexpected value')
      assert.strictEqual(output(), 1, 'output: unexpected value')
    })

    it('[bd07] atomic update: linked signal', function () {
      const input = Signal.of(1)
      const output = Signal.link(x => Signal.link(a => a + 1, [Signal.of(x)])(), [input])
      assert.strictEqual(output(), 2)
    })

    it('[b24e] nested read', function () {
      const actual = []
      const flag = Signal.of(false)
      const a = Signal.of()
      const b = Signal.of()

      Signal.link(a => actual.push(`[2]:${a}:${flag()}`), [a])
      Signal.link(b => {
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
      const b = Signal.link(a => a + 1, [a])
      const c = Signal.link((a, b) => a * b, [a, b])
      a(2); assert.strictEqual(c(), 6)
    })

    it('[4654] nested write', function () {
      const a = Signal.of(1) // immediately overwritten by 2
      const b = Signal.of()
      Signal.link(a, [b]) // [L1] aka Signal.link(b => a(b), b)
      const c = Signal.link((a, b) => a + b, [a, b]) // [L2]
      // L1 is executed before L2; thus L2 is only evaluated
      // once with a=2, b=2.
      b(2); assert.strictEqual(c(), 4)
    })
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
