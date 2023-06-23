### Signal

Time-varying values with acyclic static dependencies and synchronous glitch-free updates. **Signal** is heavily inspired by and in many aspects quite similar to [flyd](https://github.com/paldepind/flyd). Our thanks and appreciation go out to the people who provided this neat piece of software. Thank you guys!

#### Introduction

Signal provides two primitives: *Simple signals* `Signal.of` and *linked signals* `signal.link`. Simple signals are just containers for a current value. One or more input signals can be linked to one output signal. The link function derives the output value from the input values. The output signal's value is automatically updated when at least one input signal's value has changed. Note: Feeding the values of input signals into the link function promotes the use of pure functions.

```javascript
const sum = (a, b) => a + b
const a = Signal.of(39)
const b = Signal.of(3)
const c = Signal.link(sum, [a, b])
c() // 42
a(3); c() // 6
```

A signal is basically a function where the 0-ary form returns the signal's current value, and 1-ary form updates the current value. Linked signals are read-only and cannot be updated explicitly. Naturally, linked signals can be used as input signals for other linked signals.

```javascript
const { link } = Signal
const a = Signal.of(1)
const b = link(a => a + 1, a)
const c = link(b => b * 2, b)
c() // 4
```

And really, that's all there is to know. Except...

#### Signals are Monads

Signal conforms to [Fantasy Land](https://github.com/fantasyland/fantasy-land) specification for algebraic structures in the following ways:

* Filterable: `filter :: Signal s => (a -> Boolean) -> s a -> s a`
* Functor: `map :: Signal s => (a -> b) -> s a -> s b`
* Apply: `ap :: Signal s => s (a -> b) -> s a -> s b`
* Applicative: `of :: Signal s => a -> s a`
* Monad: `chain :: Signal s => (a -> s b) -> s a -> s b`

These operations can be used directly on signals (fluent interface) or preferably in point-free notation for improved composability.

```javascript
const a = Signal.of(3)
  .map(x => x + 1)
  .filter(x => x % 2 === 0)
  .map(x => x * 2)
  .chain(Signal.of)
  .ap(Signal.of(x => x > 4))
a() // true
```

Although `filter`, `map`, etc. are exposed as curried functions under the Signal namespace, e.g. `Signal.map`, we prefer using a third-party library like Ramda for point-free style.

```javascript
import * as R from 'ramda'
const fn = R.compose(
  R.ap(Signal.of(x => x > 4)),
  R.chain(Signal.of),
  R.map(x => x * 2),
  R.filter(x => x % 2 === 0),
  R.map(x => x + 1)
)

const a = fn(Signal.of(3))
a() // true
```

#### Nested signals, reads, writes

Although we advise against using functions with side-effects where possible, you can do so with Signals. Consider the following example. In link function of `b`, at label L0 `flag` in parent scope is updated to true. Updating `a` at L1 triggers the evaluation of `a`'s link function. Current value of `flag` is true during this evaluation. Control is only returned to L2 after all of `a`'s dependent links are evaluated and updated.

```javascript
const acc = []
const push = x => acc.push(x)

const flag = Signal.of(false)
const a = Signal.of()
const b = Signal.of()

link(a => {
  push(`[2]:${a}`)
  push(`[3]:${flag()}`)
}, a)

link(b => {
    push(`[1]:${b}`)
L0: flag(true)
L1: a(b * 2)
L2: flag(false)
    push(`[4]${flag()}`)
}, b)

b(2); acc // ['[1]:2', '[2]:4', '[3]:true', '[4]:false']
```

Signals as well can be nested as one would expect.

```javascript
const a = Signal.of(6)
const b = link(a => {
  const c = Signal.of(a * 2)
  const d = link(c => c / 3, c)
  return d()
}, a)
b() // 4
```

And, finally, signals can be passed around like ordinary values (which they are). Let's see how a full adder might be patched together with some logical gates.

```javascript
const toString = radix => s => s.toString(radix)
const padStart = (length, pad) => s => s.padStart(length, pad)
const split = separator => s => s.split(separator)
const binary = R.compose(
  R.map(Number), split(''), padStart(3, '0'), toString(2)
)

const XOR = R.unapply(link((a, b) => a ^ b))
const AND = R.unapply(link((a, b) => a & b))
const OR = R.unapply(link((a, b) => a | b))

const FULL_ADDER = ([a, b, c_in]) => {
  const x = XOR(a, b)
  const y = AND(x, c_in)
  const z = AND(a, b)
  const s = XOR(x, c_in)
  const c_out = OR(y, z)
  return [s, c_out]
}

const inputs = R.times(() => Signal.of(), 3)

link(
  (...xs) => console.log(xs),
  [...inputs, ...FULL_ADDER(inputs)]
)

R.range(0, 8)
  .map(binary)
  .flatMap(values => R.zip(inputs, values))
  .forEach(([fn, v]) => fn(v))
```

In the preceding example, signals are passed between different functions. Can you pin point the spots?

#### Fineprint

`undefined` (as apposed to `null`) is not considered a valid value for signals. We say a signal is undefined, when it holds `undefined` as its current value. Signals may start off undefined: `Signal.of()`, but once they have a valid value, there is no way back to undefined.

```javascript
const a = Signal.of()
a() // undefined
a(1); a() // 1
a(undefined); a() // 1 (unchanged)
a(null); a(); // null (valid signal value)
```

The same holds for linked signals.

```javascript
const a = Signal.of(3)
const b = link(a => a < 4 ? a * 2 : undefined, a)
b() // 6
a(4); b() // 6 (unchanged)
a(1); b() // 2
```

As a consequence, linked signals are only evaluated, if all input signals are defined. Signals are also only updated when the new value is different from the current value.

```javascript
const acc = []
const push = x => acc.push(x)

const a = Signal.of(1)
link(push, a)

acc // [1]
a(2); acc // [1, 2]
a(2); a(2); acc // [1, 2] // (unchanged)
a(3); a(3); acc // [1, 2, 3]
a(1); acc // [1, 2, 3, 1]
```

Updates are efficient and glitch-free, i.e. there is no inconsistent intermediate state which can be observed. Consider the following diamond-shaped dependencies.

```javascript
const acc = []
const push = x => acc.push(x)

const a = Signal.of(1)
const b = link(a => a + 3, a)
const c = link(a => a * 2, a)
const d = link((b, c) => b / c, [b, c])

link(push, d)
acc // [2] (d was evaluated once)
a(3); acc // [2, 1] (d was evaluated once again)
```

#### Why signals and not streams?

In FRP, terms still seem a little fuzzy, maybe because there are. But one thing seems pretty clear: Streams don't have the notion of a *current value*, which can be queried at any given time. Thus we use the term signal. Signals (think of digital logic circuits), have discrete values which can and usually do vary over time. Also, we *link* one or more input signals to one output signal `const AND = link((a, b) => a && b, [a, b])`.

To be continued...