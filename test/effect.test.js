import assert from 'assert'
import { Signal as Polyfill } from 'signal-polyfill'
import Signal from '@syncpoint/signal'

const { State, Computed } = Polyfill
const { Watcher } = Polyfill.subtle

// 'Simple' effect as proposed in different locations.
// Don't care about clean-up for brevity.
const effect = callback => {
  let busy = false
  const watcher = new Watcher(() => {
    const pull = () => {
      // Pulling immediately may result in stale state.
      watcher.getPending().forEach(s => s.get())
      watcher.watch() // re-watch
      busy = false
    }

    !busy && (busy = true, queueMicrotask(pull))
  })

  const computed = new Computed(callback)
  watcher.watch(computed)
  computed.get()
}

describe('Polyfill', function () {
  it('async/effect', async function () {
    const a = new State(4)
    const acc = []
    effect(() => acc.push(a.get()))
    const countdown = ((n) => {
      const timer = setInterval(() => {
        if (n) a.set(n--)
        else clearInterval(timer)
      }, 0)
    })

    countdown(3)
    await new Promise(resolve => setTimeout(resolve, 10))
    assert.deepStrictEqual(acc, [4, 3, 2, 1]) //=> [PASS]
  })

  it.skip('sync/effect [not possible]', function () {
    const a = new State(4)
    const acc = []
    effect(() => acc.push(a.get()))
    ;[3, 2, 1].forEach(a.set.bind(a))
    assert.deepStrictEqual(acc, [4, 3, 2, 1]) //=> [FAIL] actual: [4]
  })
})

describe('Signal', function () {
  it('on :: Signal s => (a -> *) -> s a -> (() -> Unit)', function () {
    const a = Signal.of(4)
    const acc = []
    a.on(v => acc.push(v)) // eager, synchronous effect
    ;[3, 2, 1].map(a)
    assert.deepStrictEqual(acc, [4, 3, 2, 1]) //=> [PASS]
  })

  it('scan :: Signal s => (b -> a -> b) -> b -> s a -> s b', function () {
    const a = Signal.of(4)
    const b = Signal.scan((acc, v) => acc.concat(v), [], a)
    ;[3, 2, 1].map(a)
    assert.deepStrictEqual(b(), [4, 3, 2, 1]) //=> [PASS]
  })
})
