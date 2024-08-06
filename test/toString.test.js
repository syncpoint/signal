import assert from 'node:assert'
import { describe, it } from "mocha";
import Signal from '../lib/index.js'

describe('Signal.toString', function () {
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

  it('[4ddf] toString :: Signal s => s -> String', function () {
    const a = Signal.of(0, { label: 'a' })
    assert.strictEqual(a.toString(), 'Signal[a](0)')
  })
})
