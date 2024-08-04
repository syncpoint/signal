import assert from 'assert'
import { describe, it } from 'mocha'
import * as R from 'ramda'
import Signal from '../lib/index.js'
import recorder from './recorder.js'

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
      Signal.link(push, output)

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

  // Setoid.

  it('[f9fd] equals :: Signal s => s a -> s b -> Boolean (reflexivity)', function () {
    const a = Signal.of(3)
    assert.strictEqual(a['fantasy-land/equals'](a), true)
  })

  it('[acad] equals :: Signal s => s a -> s b -> Boolean (symmetry)', function () {
    const a = Signal.of(3)
    const b = Signal.of(3)
    assert.strictEqual(a['fantasy-land/equals'](b), b['fantasy-land/equals'](a))
  })

  it('[50d0] equals :: Signal s => s a -> s b -> Boolean (symmetry)', function () {
    const a = Signal.of(2)
    const b = Signal.of(3)
    assert.strictEqual(a['fantasy-land/equals'](b), b['fantasy-land/equals'](a))
  })

  it('[8b7b] equals :: Signal s => s a -> s b -> Boolean (transitivity)', function () {
    const a = Signal.of(3)
    const b = Signal.of(3)
    const c = Signal.of(3)

    const actual = [
      a['fantasy-land/equals'](b),
      b['fantasy-land/equals'](c),
      a['fantasy-land/equals'](c)
    ]

    assert.deepStrictEqual(actual, [true, true, true])
  })

  // Ord.

  it('[6e3a] lte :: Signal s => s a -> s b -> Boolean (totality)', function () {
    const a = Signal.of(3)
    const b = Signal.of(4)
    assert(a['fantasy-land/lte'](b) || b['fantasy-land/lte'](a))
  })

  it('[6e3a] lte :: Signal s => s a -> s b -> Boolean (totality)', function () {
    const a = Signal.of(4)
    const b = Signal.of(3)
    assert(a['fantasy-land/lte'](b) || b['fantasy-land/lte'](a))
  })

  it('[6e3a] lte :: Signal s => s a -> s b -> Boolean (antisymmetry)', function () {
    const a = Signal.of(3)
    const b = Signal.of(3)

    const actual = [
      a['fantasy-land/lte'](b),
      b['fantasy-land/lte'](a),
      a['fantasy-land/equals'](b)
    ]

    assert.deepStrictEqual(actual, [true, true, true])
  })

  it('[722c] lte :: Signal s => s a -> s b -> Boolean (transitivity)', function () {
    const a = Signal.of(1)
    const b = Signal.of(2)
    const c = Signal.of(3)

    const actual = [
      a['fantasy-land/lte'](b),
      b['fantasy-land/lte'](c),
      a['fantasy-land/lte'](c)
    ]

    assert.deepStrictEqual(actual, [true, true, true])
  })
})
