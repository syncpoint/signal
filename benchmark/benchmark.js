#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import os from 'os'
import assert from 'assert'
import { fileURLToPath } from 'url';
import * as bench from 'micro-bmark'
import * as R from 'ramda'
import Signal from '../lib/index.js'
import { encode, decode, parallelAdder } from '../test/adder.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filename = path.join(__dirname, '..', 'package.json');
const version = JSON.parse(fs.readFileSync(filename, 'utf8')).version

console.log(`@syncpoint/signal v${version}`, new Date())
console.log(`CPU: ${os.cpus()[0].model}`)
console.log(`OS: ${os.version()}`)
bench.utils.logMem()

await bench.mark('### JIT COMPILER WARM-UP (ignore) ###', 10000, () => {
  assert.strictEqual(Signal.of()(), undefined)
  assert.strictEqual(Signal.of(10)(), 10)

  {
    const a = Signal.of(1)
    const b = Signal.link(a => a + 2, a)
    assert.strictEqual(b(), 3)
  }

  {
    const a = Signal.of(1)
    a(2)
    assert.strictEqual(a(), 2)
  }

  {
    const a = Signal.of(1)
    const b = Signal.link(a => a + 1, a)
    const c = Signal.link(b => b + 1, b)
    a(2)
    assert.strictEqual(c(), 4)
  }

  {
    const a = Signal.of(1)
    const b = Signal.link(a => a + 1, a)
    const c = Signal.link(a => a + 2, a)
    const d = Signal.link((b, c) => b * c, [b, c])
    a(2)
    assert.strictEqual(d(), 12)
  }
})

// of :: Signal s => () -> s
await bench.mark('[80cd]', 10000, () => {
  assert.strictEqual(Signal.of()(), undefined)
})

// of :: Signal s => v -> s v
await bench.mark('[4e38]', 10000, () => {
  assert.strictEqual(Signal.of(10)(), 10)
})

// link :: Signal s => (a -> b) -> s a -> s b
await bench.mark('[a642]', 10000, () => {
  const a = Signal.of(1)
  const b = Signal.link(a => a + 2, a)
  assert.strictEqual(b(), 3)
})

// link :: Signal s => (...[*] -> b) -> [s *] -> s b
await bench.mark('[3155]', 10000, () => {
  const a = Signal.of(1)
  const b = Signal.of(2)
  const c = Signal.link((a, b) => a + b, [a, b])
  assert.strictEqual(c(), 3)
})

// set :: Signal s => v -> s v
await bench.mark('[4568]', 10000, () => {
  const a = Signal.of(1)
  a(2)
  assert.strictEqual(a(), 2)
})

// link :: Signal s => (...[*] -> b) -> [s *] -> s b
await bench.mark('[9a8c]', 10000, () => {
  const a = Signal.of(1)
  const b = Signal.link(a => a + 1, a)
  const c = Signal.link(b => b + 1, b)
  a(2)
  assert.strictEqual(c(), 4)
})

// link :: Signal s => (...[*] -> b) -> [s *] -> s b
await bench.mark('[44b2]', 10000, () => {
  const a = Signal.of(1)
  const b = Signal.link(a => a + 1, a)
  const c = Signal.link(b => b + 1, b)
  const d = Signal.link(c => c + 1, c)
  a(2)
  assert.strictEqual(d(), 5)
})

// link :: Signal s => (...[*] -> b) -> [s *] -> s b
await bench.mark('[96f2]', 10000, () => {
  const a = Signal.of(1)
  const b = Signal.link(a => a + 1, a)
  const c = Signal.link(b => b + 1, b)
  const d = Signal.link(c => c + 1, c)
  const e = Signal.link(d => d + 1, d)
  a(2)
  assert.strictEqual(e(), 6)
})

// diamond
await bench.mark('[ee70]', 10000, () => {
  const a = Signal.of(1)
  const b = Signal.link(a => a + 1, a)
  const c = Signal.link(a => a + 2, a)
  const d = Signal.link((b, c) => b * c, [b, c])
  a(2)
  assert.strictEqual(d(), 12)
})

// diamond/extended
await bench.mark('[bd93]', 10000, () => {
  const a = Signal.of()
  const b = Signal.link(a => a + 1, [a])
  const c = Signal.link(a => a + 2, [a])
  const d = Signal.link(c => c + 3, [c])
  const e = Signal.link((b, d) => b + d, [b, d])
  const f = Signal.scan(R.flip(R.append), [], e)
  ;[1, 5, 11, 5, 1].forEach(a)
  assert.deepStrictEqual(f(), [8, 16, 28, 16, 8])
})

// 16-bit adder
await bench.mark('[62cb]', 100, () => {
  const i0 = Math.ceil(Math.random() * 32768)
  const i1 = Math.ceil(Math.random() * 32768)
  const { a, b, s, cout } = parallelAdder(Signal.of(0))
  encode(i0).forEach((v, i) => a[i](v))
  encode(i1).forEach((v, i) => b[i](v))
  const actual = decode([...s.map(s => s()), cout()])
  assert.strictEqual(actual, i0 + i1)
})

// matrix (4 x 20)
await bench.mark('[4357]', 10, () => {
  // Currently depths of 30 and up cannot be handled because of an issue in increase/decrease.
  const depth = 30
  const expected = {
    10: [2, 4, -2, -3],
    15: [-1, -2, 3, 4],
    20: [-2, 1, -4, -4],
    25: [3, 2, 4, 2],
    30: [-4, -3, -2, -1],
    35: [4, 4, 1, -2]
  }

  const layers = R.range(0, depth).reduce((acc, i) => {
    acc.push([
      Signal.link(b => b, acc[i][1]),
      Signal.link((a, c) => a - c, [acc[i][0], acc[i][2]]),
      Signal.link((b, d) => b + d, [acc[i][1], acc[i][3]]),
      Signal.link(c => c, acc[i][2])
    ])
    return acc
  }, [[Signal.of(1), Signal.of(2), Signal.of(3), Signal.of(4)]])

  ;[4, 3, 2, 1].forEach((v, i) => R.head(layers)[i](v))
  const actual = R.last(layers).map(fn => fn())
  assert.deepStrictEqual(actual, expected[depth])
})

bench.utils.logMem()
