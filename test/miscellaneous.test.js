import assert from 'assert'
import { describe, it } from 'mocha'
import * as R from 'ramda'
import Signal from '../lib/index.js'

describe('miscellaneous operators', function () {
  it('[ae26] startWith :: Signal s => a -> s a -> s a', function () {
    // Initial value if signal is undefined.
    const a = Signal.of()
    const b = Signal.startWith(0, a)
    assert.strictEqual(b(), 0)
    a(1); assert.strictEqual(b(), 1)
  })

  it('[46de] startWith :: Signal s => (() -> a) -> s a -> s a', function () {
    // Initial value (from function) if signal is undefined.
    const a = Signal.of()
    const b = Signal.startWith(() => 0, a)
    assert.strictEqual(b(), 0)
    a(1); assert.strictEqual(b(), 1)
  })

  it('[46de] startWith :: Signal s => a -> s a -> s a', function () {
    // Initial value for linked signal.
    const a = Signal.of()
    const b = Signal.link(a => a + 1, [a])
    const c = Signal.startWith(0, b)
    assert.strictEqual(c(), 0)
    a(1); assert.strictEqual(c(), 2)
  })

  it('[b308] startWith :: Signal s => a -> s a -> s a', function () {
    // Initial value is ignored if signal is defined.
    const a = Signal.of(1)
    const b = Signal.startWith(0, a)
    assert.strictEqual(b(), 1)
    a(2); assert.strictEqual(b(), 2)
  })

  it('merge :: Signal s => s a -> s b -> s (a | b)', function () {
    const a = Signal.of()
    const b = Signal.of()
    const c = Signal.merge(a, b)
    const d = Signal.scan(R.flip(R.append), [], c)
    assert.strictEqual(d(), undefined)

    a(1); b('2'); b('3'); a(4); b('5')
    assert.deepStrictEqual(d(), [1, '2', '3', 4, '5'])
  })

  it('scan :: Signal s => (b -> a -> b) -> b -> s a -> s b', function () {
    const a = Signal.of()
    const b = Signal.scan((acc, a) => acc + a, 0, a)
    R.range(0, 10).forEach(a)
    assert.strictEqual(b(), 45)
  })

  it('tap :: Signal s => (a -> any) -> s a -> s a', function () {
    let actual = 0
    const a = Signal.of()
    const b = Signal.tap(a => (actual += a), a)
    R.range(0, 10).forEach(a)
    assert.strictEqual(actual, 45)
    assert.strictEqual(b(), 9)
  })

  it('loop :: Signal s => (b -> a -> [b, c]) -> b -> s a -> s c', function () {
    const average = xs => xs.reduce((a, b) => a + b) / xs.length
    const a = Signal.of()
    const b = Signal.loop((xs, x) => {
      xs.push(x); xs = xs.slice(-10)
      return [xs, average(xs)]
    }, [], a)
    R.range(0, 20).forEach(a)
    assert.strictEqual(b(), 14.5) // sum(10..19) / 10
  })

  it('lift :: Signal s => ((a -> b -> ...) -> x) -> s a -> s b -> ... -> s x', function () {
    const a = Signal.of()
    const b = Signal.of()
    const c = Signal.lift((a, b) => a + b, a, b)
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
      const output = Signal.chain(x => {
        return emitters[x] && Signal.fromListeners(['event'], emitters[x])
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

        Signal.link(x => acc.push(x), output)
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