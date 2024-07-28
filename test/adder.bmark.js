#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import os from 'os'
import assert from 'assert'
import { fileURLToPath } from 'url';
import * as bench from 'micro-bmark'
import Signal from '../lib/index.js'
import { encode, decode, parallelAdder } from './adder.js'

const operand = () => Math.ceil(Math.random() * 32768)

const run = () => {
  const i0 = operand()
  const i1 = operand()
  const { a, b, s, cout } = parallelAdder(Signal.of(0))
  encode(i0).forEach((v, i) => a[i](v))
  encode(i1).forEach((v, i) => b[i](v))
  const actual = decode([...s.map(s => s()), cout()])
  assert.strictEqual(actual, i0 + i1)
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filename = path.join(__dirname, '..', 'package.json');
const version = JSON.parse(fs.readFileSync(filename, 'utf8')).version

console.log(`@syncpoint/signal v${version}`, new Date())
console.log(`CPU: ${os.cpus()[0].model}`)
console.log(`OS: ${os.version()}`)
bench.utils.logMem()
await bench.mark('16-bit full adder', run);
bench.utils.logMem()
