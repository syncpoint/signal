import assert from 'node:assert'
import { describe, it } from "mocha";
import Signal from '../lib/index.js'

describe('Signal.on', function () {
  it('Effect (direct) should only be called on changed value', function () {
    let called = 0
    const a = Signal.of()
    a.on(() => (called += 1))
    assert.strictEqual(called, 0)
    a(1); assert.strictEqual(called, 1)
    a(1); assert.strictEqual(called, 1)
  })

  it('Effect (indirect) should only be called on changed value', function () {
    let called = 0
    const a = Signal.of()
    const b = a.map(a => a % 2)
    b.on(() => (called += 1))
    a(2); assert.strictEqual(called, 1)
    a(4); assert.strictEqual(called, 1)
  })

  it('on :: Signal s => (a -> *) -> s a -> (() -> Unit)', function () {
    const acc = []
    const push = x => acc.push(x)
    const a = Signal.of(2)
    const dispose = a.on(push)
    a(3); dispose()
    a(4); a(5) // ignored after disposing effect.
    assert.deepStrictEqual(acc, [2, 3])
  })
})
