import assert from 'node:assert'
import * as R from 'ramda'
import { describe, it } from "mocha";
import Signal from '../lib/index.js'
import sleep from './_sleep.js'

describe('Signal.deferred', function () {
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

  describe('"equals" option', function () {
    it('deferred', function () {
      const a = Signal.deferred(() => Promise.resolve(1), { equals: R.F })
      const b = Signal.scan(R.flip(R.append), [], a)
      setImmediate(() => {
        R.range(0, 4).forEach(() => a(1))
        assert.deepStrictEqual(b(), [1, 1, 1, 1, 1])
      })
    })
  })
})