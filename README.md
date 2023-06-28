### Signal

Time-varying values with acyclic static dependencies and synchronous glitch-free updates. **Signal** is heavily inspired by and in many aspects quite similar to [flyd](https://github.com/paldepind/flyd). Our thanks and appreciation go out to the people who provided this neat piece of software. Thank you guys!

#### Motivation

Signal falls in the broad spectrum of Functional Reactive Programming (FRP). We think FRP is not a fancy hammer (sorry: technology) which solves each and every problem. It's rather a different way to think about certain problems and derive solutions which posses properties common to functional programming in general. We are not here to argue whether or not FP might have its benefits over imperative paradigm. We simply offer a small abstraction which might be useful to you in certain circumstances.

Signal is one of many packages out there to choose from. Some of them are Methusalems pathing the FRP way starting nearly a decade ago. Some are feature-packed Swiss Army knives for nearly every conceivable use case. Some are heavy, some are light. Some are abandoned, some are actively maintained. It's hard to layout a map of FRP-Land and it's even harder to pin-point the exact location where package XY sits.

But we can say what Signal is not: Signal is not a Web/GUI framework like Solid, Vue or the likes. Signal is not RxJS. Signal is not an application state management framework like Redux or MobX. Signal is not a framework at all. Signal is just signals.

#### History of Origins

For one of our projects we had to extent a rather complex OpenLayers interaction to support custom geometries. Three attempts to extent the existing code failed. We figured that encapsulating a ton of mutable state in a single class was not the way we wanted to do business. We looked into alternative approaches to structure code and route and transform incoming mouse and keyboard events until they eventually updated the view model. The first implementation was based on [@most/core](https://github.com/mostjs/core) which worked out really nice. But the older I the author get, the more paranoid about project dependencies I become. @most/core seemed a little dormant, it is written in TypeScript (we are not huge fans of) and has some inherent complexity for features we don't need (async scheduling, time tracking). Maintaining @most/core if necessary was out of the question. Next [flyd](https://github.com/paldepind/flyd). Yes, an old-timer too, but simple enough. Migrating to flyd was as simple as it gets. No scheduler, synchronous updates and a relatively small JavaScript code base. In the end, flyd had some rough edges we liked to iron out *et voilà*, Signal came into being.

#### Introduction

Signal provides two primitives: *Simple signals* `Signal.of` and *linked signals* `Signal.link`. Simple signals are just containers for a current value. One or more input signals can be linked to one output signal. The link function derives the output value from the input values. The output signal's value is automatically updated when at least one input signal's value has changed.

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

Side-effects can be triggered with `Signal.on`. The side-effect function is invoked every time the signal value changes. `Signal.on` returns a function which, when called, removes the effect from the signal's dependent list, so it is no longer called.

```javascript
const a = Signal.of()
const acc = []
const push = x => acc.push(x)

// Hint: a.on(fn) is the same as Signal.on(fn, a)
const dispose = a.on(push)
a(1); a(2); acc // [1, 2]
dispose()
a(3); acc // [1, 2] (unchanged)
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

Although we advise against using functions with side-effects where possible, you can do so with Signal. Consider the following example. In link function of `b`, at label L0 `flag` in parent scope is updated to true. Updating `a` at L1 triggers the evaluation of `a`'s link function. Current value of `flag` is true during this evaluation. Control is only returned to L2 after all of `a`'s dependent links are evaluated and updated.

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

And finally, signals can be passed around like ordinary values (which they are). The following example is a 16-bit ripple-carry adder using full adders (2 x XOR, 2 x AND, 1 x OR). That's a grand total of 113 signals.

```javascript
import * as R from 'ramda'

const xor = R.unapply(link((a, b) => a ^ b))
const and = R.unapply(link((a, b) => a & b))
const or = R.unapply(link((a, b) => a | b))
const toString = radix => s => s.toString(radix)
const padStart = (length, pad) => s => s.padStart(length, pad)
const split = separator => s => s.split(separator)
const decode = xs => parseInt(xs.reverse().join(''), 2)
const encode = R.compose(
  R.reverse, R.map(Number), split(''), padStart(16, '0'), toString(2)
)

const fullAdder = ([a, b, cin]) => {
  const x = xor(a, b)
  const s = xor(x, cin)
  const cout = or(and(x, cin), and(a, b))
  return [s, cout]
}

const parallelAdder = cin => R.range(0, 16).reduce(acc => {
  const ab = [Signal.of(), Signal.of()]
  const [s, cout] = fullAdder([...ab, acc.cout])
  acc.a.push(ab[0]); acc.b.push(ab[1]); acc.s.push(s)
  acc.cout = cout // c_in of next adder is c_out of previous adder
  return acc
}, { a: [], b: [], s: [], cout: cin }) // a, b, s: 16-bits each

const { a, b, s, cout } = parallelAdder(Signal.of(0))
encode(47813).forEach((v, i) => a[i](v))
encode(19987).forEach((v, i) => b[i](v))
decode([...s.map(s => s()), cout()]) // 67800
```

#### Fine-print: `undefined`

`undefined` (in contrast to `null`) is not considered a valid value for signals. We say a signal is undefined, when it holds `undefined` as its current value. Signals may start off undefined: `Signal.of()`, but once they have a valid value, there is no way back to undefined.

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

As a consequence, linked signals are only evaluated, if all input signals are defined. 

```javascript
const acc = []
const push = x => acc.push(x)

const a = Signal.of()
link(push, a)

acc // [] (not evaluated, yet)
a(1); a(1); acc // [1, 1]
a(2); acc // [1, 1, 2]
```

#### Fine-print: Glitch-free

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

#### Fine-print: Disposable

You might have noticed the absence of `stream.end` which flyd provides for ending streams and removing them from the dependency graph. That's because signals cannot be ended or closed. Also there is no way of removing signals or dependencies programmatically from the static dependency graph once they have been added. With one exception, which happens under the hood in private territory: `chain`. `chain` operates on a signal of signal of values `Signal s => s s a`. For each new signal of values `chain` receives, a linked signal (an effect actually) is created which update the outer output signal with values it receives from the current signal of values. Upon arrival of a new signal of values, this effect is unlinked and the dependency is removed from the previous signal of values. Now for the interesting part: When the current signals is replaced with a new one, `chain` checks if the signal incidentally has a `dispose` function. If so `dispose` is called during the process of unlinking the effect from the signal of values. `dispose` is completely optional, but can be useful to clean up resources of signals which are dynamically created and flattened through `chain`. `fromListeners` operator for example has a `dispose` function which removes registered listeners from the target.

```javascript
const { chain, fromListeners } = Signal
const target = Signal.of()
const events = chain(fromListeners(['change']), target)
```

Whenever `target` is updated with a new target, change listener is registered on the new target and deregistered from the previous target. `event` is updated with (flattened) change events.

Super fine-print: When `chain` function does return a value other than a signal (null for example), the previous signal of values (if any) is cleaned up and no new effect is created until a signal of values is received again.

#### Fine-print: Error Handling

Easy! None. Using Maybe, Either or similar as signal values might be beneficial.

#### Why signals and not streams?

Streams don't have the notion of a *current value*, which can be queried at any given time. Hence we favor the term signal over stream. Signals (think of digital logic circuits), have discrete values which can and usually do vary over time. Also, we *link* one or more input signals to one output signal `const AND = link((a, b) => a && b, [a, b])`.

#### Miscellaneous Operators

The following operators live under the Signal namespace and might be handy or they might not. There is no real reason to include them in this library, except that we use them for a different project. These operators can all be implemented with a few lines of code and only use the public API introduced so far.

`fromListeners` was already mentioned above.

```
fromListeners :: [String] -> Target -> Signal Event
```

`startWith` injects a signal value where a signal would be undefined otherwise. This is mainly relevant for linked signals or signals created from listeners.

```javascript
// startWith :: Signal s => a -> s a -> s a
// startWith :: Signal s => (() -> a) -> s a -> s a
const a = Signal.of()
const b = link(a => a + 1, a)
const c = Signal.startWith(0, b)
c() // 0
```

`scan` feeds back the calculated signal value as an accumulator for the next value.

```javascript
// scan :: Signal s => (b -> a -> b) -> b -> s a -> s b
const a = Signal.of()
const b = Signal.scan((acc, a) => acc + a, 0, a)
R.range(0, 10).forEach(a)
b() // 45; sum 0..9
```

`loop` is similar to `scan`, but the value for the accumulator and the returned signal value can be different.

```javascript
// loop :: Signal s => (b -> a -> [b, c]) -> b -> s a -> s c
const average = xs => xs.reduce((a, b) => a + b) / xs.length
const a = Signal.of()
const b = Signal.loop((xs, x) => {
  xs.push(x); xs = xs.slice(-10)
  return [xs, average(xs)]
}, [], a)
R.range(0, 20).forEach(a)
b() // 14.5; sum 10..19 / 10
```

`lift` applies the values of *n* signals to a n-ary function. It might not be obvious, but `lift` is pretty much the same as `link`, expect for the signal parameters, which are not given as an array of signals, but individually.

```javascript
// lift :: Signal s => ((a -> b -> ...) -> x) -> s a -> s b -> ... -> s x
const a = Signal.of()
const b = Signal.of()
const c = Signal.lift((a, b) => a + b, a, b)
a(1); b(2); c() // 3
```

`tap` is used for side-effects while passing on the value (hopefully unchanged).

```javascript
// tap :: Signal s => (a -> any) -> s a -> s a
const fn = R.compose(
  Signal.tap(x => console.log(x)), // 2
  R.map(x => x + 1)
)

const a = fn(Signal.of(1))
a() // 2
```

`skipRepeats` filters consecutive values that are equal. This operator has two forms. The second form accepts a custom function for equality checks ( `===` being the default check.)

```javascript
// skipRepeats :: Signal s => s a -> s a
// skipRepeats :: Signal s => (a -> a -> Boolean) -> s a -> s a
const a = Signal.of(1)
const b = skipRepeats(a)
const c = scan((acc, x) => [...acc, x], [], b)
;[1, 1, 1, 2, 2, 1, 3].forEach(a)
c() // [1, 2, 1, 3]
```

