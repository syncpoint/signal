import assert from 'node:assert'
import { describe, it } from 'mocha'
import * as R from 'ramda'
import Signal from '../lib/index.js'

describe('Signal.fromListener', function () {
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
        const removeEventListener = () => {
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
