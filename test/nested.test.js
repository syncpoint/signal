import assert from 'assert'
import { describe, it } from 'mocha'
import Signal from '../lib/index.js'

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
