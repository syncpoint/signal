/* eslint-disable */
import assert from 'assert'
import * as R from 'ramda'
import Signal from '../lib/index.js'

// Compatibility
const flyd = {
  stream: v => {
    const signal = Signal.of(v)

    // `of :: a -> Signal a` should probably be
    // limited to type representative `Signal`.
    // But what the heck? We want to see happy test cases!
    // 263c, 4cab, 81df, 10a7 and 4727.
    signal.of =
    signal['fantasy-land/of'] = signal.constructor.of
    return signal
  },
  on: (fn, signal) => Signal.link(fn, signal),
  isStream: Signal.isSignal,
  combine: Signal.link,
  map: Signal.map,
  chain: Signal.chain,
  scan: Signal.scan,
  merge: Signal.merge,
  ap: Signal.ap
}

const stream = flyd.stream;
const combine = flyd.combine;
const map = flyd.map;
const chain = flyd.chain;

// Reverse parameter order ('old ap').
const ap = a => b => flyd.ap(b, a)

// NeoVance/flyd (fork)
const slice = Array.prototype.slice
const concat = Array.prototype.concat
function curryN(n, func) {
  return function() {
    var args = slice.call(arguments)
    if (args.length >= n) return func.apply(null, args)
    else return curryN(n - args.length, function() {
      return func.apply(null, concat.call(args, slice.call(arguments)))
    })
  }
}

// Some combinators
function doubleFn(x) { return x * 2; }
function sumFn(x, y) { return x + y; }
function identityLift(x) { return x; }

describe('stream', function() {
  describe('dependent streams', function() {
    it('[c6a4] updates dependencies', function() {
      var x = stream(3);
      var x2 = combine(doubleFn, [x]);
      assert.equal(x2(), x() * 2);
    });
    it('[3bc6] can set result by returning value', function() {
      var x = stream(3);
      var y = stream(4);
      var sum = combine(sumFn, [x, y]);
      assert.equal(sum(), x() + y());
    });
    it('[4ce8] is updated when dependencies change', function() {
      var x = stream(3);
      var y = stream(4);
      var sum = combine(sumFn, [x, y]);
      assert.equal(sum(), x() + y()); // 7
      x(12);
      assert.equal(sum(), x() + y()); // 16
      y(8);
      assert.equal(sum(), x() + y()); // 20
    });
    it('[bf8f] can set result by calling callback', function() {
      var x = stream(3);
      var y = stream(4);
      var times = 0;
      var sum = combine(sumFn, [x, y]);
      combine(function() {
        times++;
      }, [sum]);
      assert.equal(sum(), x() + y()); // 7
      x(12);
      assert.equal(sum(), x() + y()); // 16
      y(8);
      assert.equal(sum(), x() + y()); // 20
      assert.equal(times, 3);
    });
    it('[35f3] is not called until dependencies have value', function() {
      var x = stream();
      var y = stream();
      var called = 0;
      combine(function(x, y) {
        called++;
        return x + y;
      }, [x, y]);
      x(2); x(1); y(2); y(4); x(2);
      assert.equal(called, 3);
    });
    it('[4097] streams can lead into other streams', function() {
      var x = stream(3);
      var y = stream(4);
      var sum = combine(sumFn, [x, y]);
      var twiceSum = combine(doubleFn, [sum]);
      var sumPlusDoubleSum = combine(sumFn, [twiceSum, sum]);
      x(12);
      assert.equal(sumPlusDoubleSum(), sum() * 3);
      y(3);
      assert.equal(sumPlusDoubleSum(), sum() * 3);
      x(2);
      assert.equal(sumPlusDoubleSum(), sum() * 3);
      assert.equal(sumPlusDoubleSum(), (2 + 3) * 3);
    });
    it('[4362] handles dependencies when streams are triggered in streams', function() {
      var x = stream(4);
      var y = stream(3);
      var z = stream(1);
      var doubleX = combine(doubleFn, [x]);
      var setAndSum = combine(function(y, z) {
        x(3);
        return z + y;
      }, [y, z]);
      z(4);
      assert.equal(setAndSum(), 7);
      assert.equal(doubleX(), 6);
    });
    it('[4799] can filter values', function() {
      var result = [];
      var n = stream(0);
      var lrg5 = combine(function(n) {
        if (n > 5) return n;
      }, [n]);
      flyd.map(function(v) { result.push(v); }, lrg5);
      n(4)(6)(2)(8)(3)(4);
      assert.deepEqual(result, [6, 8]);
    });
    it('[ae90] can set another stream\'s value multiple times from inside a stream', function() {
      var result = [];
      var a = stream();
      var b = stream();
      combine(function(b) {
        a(b);
        a();
        a(b + 1);
        assert.equal(a(), 2);
      }, [b]);
      combine(function(a) {
        result.push(a);
      }, [a]);
      b(1);
      assert.deepEqual(result, [1, 2]);
    });
  });

  describe('streams created within dependent stream bodies', function() {
    it('[4151] if dependencies are met it is updated eventually', function() {
      var result;
      stream(1).pipe(map(function() {
        var n = flyd.stream(1);
        n.pipe(map(function(v) { result = v + 100; }));
      }));
      assert.equal(result, 101);
    });
    it('[a9b8] if dependencies are not met at creation it is updated after their dependencies are met', function() {
      var result;
      stream(1).pipe(map(function() {
        var n = stream();
        n.pipe(map(function(v) { result = v + 100; }));
        n(1);
      }));
      assert.equal(result, 101);
    });
    it('[4d54] can create multi-level dependent streams inside a stream body', function() {
      var result = 0;
      var externalStream = stream(0);
      function mapper(val) {
        ++result;
        return val + 1;
      }
      stream(1).map(function() {
        externalStream
          .map(mapper)
          .map(mapper);
        return;
      });
      assert.equal(result, 2);
    });
    it('[99b3] can create multi-level dependent streams inside a stream body part 2', function() {
      var result = '';
      var externalStream = stream(0);
      var theStream = stream(1);
      function mapper(val) {
        result += '' + val;
        return val + 1;
      }
      theStream.map(function() {
        externalStream
          .map(mapper)
          .map(mapper);
        return;
      });
      theStream(2);
      assert.equal(result, '0101');
    });
  });

  describe('on', function() {
    it('[4121] is invoked when stream changes', function() {
      var s = flyd.stream();
      var result = [];
      var f = function(val) { result.push(val); };
      flyd.on(f, s);
      s(1)(2);
      assert.deepEqual(result, [1, 2]);
    });
  });

  describe('map', function() {
    it('[4ddd] maps a function', function() {
      var x = stream(3);
      var doubleX = x.pipe(map(function(x) { return 2 * x; }));
      assert.equal(doubleX(), 6);
      x(1);
      assert.equal(doubleX(), 2);
    });
    it('[8425] maps a function', function() {
      var x = stream(3);
      var doubleX = flyd.map(function(x) { return 2 * x; }, x);
      assert.equal(doubleX(), 6);
      x(1);
      assert.equal(doubleX(), 2);
    });
    it('[40ba] is curried', function() {
      var x = stream(3);
      var doubler = flyd.map(function(x) { return 2 * x; });
      var quadroX = doubler(doubler(x));
      assert.equal(quadroX(), 12);
      x(2);
      assert.equal(quadroX(), 8);
    });
    it('[b677] returns equivalent stream when mapping identity', function() {
      var x = stream(3);
      var x2 = x.pipe(map(function(a) { return a; }));
      assert.equal(x2(), x());
      x('foo');
      assert.equal(x2(), x());
    });
    it('[9895] is compositive', function() {
      function f(x) { return x * 2; }
      function g(x) { return x + 4; }
      var x = stream(3);
      var s1 = x.pipe(map(g)).pipe(map(f));
      var s2 = x.pipe(map(function(x) { return f(g(x)); }));
      assert.equal(s1(), s2());
      x(12);
      assert.equal(s1(), s2());
    });
  });

  describe('chain', function() {
    it('[4afe] applies function to values in stream', function() {
      var result = [];
      function f(v) {
        result.push(v);
        return stream();
      }
      var s = stream();
      flyd.chain(f, s);
      s(1)(2)(3)(4)(5);
      assert.deepEqual(result, [1, 2, 3, 4, 5]);
    });
  });

  describe('scan', function() {
    it('[ab9b] can sum streams of integers', function() {
      var numbers = stream();
      var sum = flyd.scan(function(sum, n) {
        return sum + n;
      }, 0, numbers);
      numbers(3)(2)(4)(10);
      assert.equal(sum(), 19);
    });
    it('[a5a5] is curried', function() {
      var numbers = stream();
      var sumStream = flyd.scan(function(sum, n) {
        return sum + n;
      }, 0);
      var sum = sumStream(numbers);
      numbers(3)(2)(4)(10);
      assert.equal(sum(), 19);
    });
  });

  describe('ap', function() {
    it('[2c93] applies functions in stream', function() {
      var a = stream(function(x) { return 2 * x; });
      var v = stream(3);
      var s = a.pipe(ap(v));
      assert.equal(s(), 6);
      a(function(x) { return x / 3; });
      assert.equal(s(), 1);
      v(9);
      assert.equal(s(), 3);
    });
    it('[42ce] is compositive', function() {
      var a = stream(function(x) { return x * 2; });
      var u = stream(function(x) { return x + 5; });
      var v = stream(8);
      var s1 = a
        .pipe(map(function(f) {
          return function(g) {
            return function(x) {
              return f(g(x));
            };
          };
        }))
        .pipe(ap(u))
        .pipe(ap(v));
      var s2 = a.pipe(ap(u.pipe(ap(v))));
      assert.equal(s1(), 26);
      assert.equal(s2(), 26);
      a(function(x) { return x * 4; });
      assert.equal(s1(), 52);
      assert.equal(s2(), 52);
      u(function(x) { return x / 8; });
      assert.equal(s1(), 4);
      assert.equal(s2(), 4);
      v(24);
      assert.equal(s1(), 12);
      assert.equal(s2(), 12);
    });
    it('[bdfd] supports neat ap pattern', function() {
      var result = [];
      var sumThree = curryN(3, function(x, y, z) {
        return x + y + z;
      });
      var s1 = stream(0);
      var s2 = stream(0);
      var s3 = stream(0);
      var sum = flyd.map(sumThree, s1).pipe(ap(s2)).pipe(ap(s3));
      flyd.map(function(v) { result.push(v); }, sum);
      s1(3); s2(2); s3(5);
      assert.deepEqual(result, [0, 3, 5, 10]);
    });
    it('[4585] applies functions if streams have no initial value', function() {
      var result = [];
      var add = curryN(2, function(x, y) { return x + y; });
      var numbers1 = stream();
      var numbers2 = stream();
      var addToNumbers1 = flyd.map(add, numbers1);
      var added = addToNumbers1.pipe(ap(numbers2));
      flyd.map(function(n) { result.push(n); }, added);
      numbers1(3); numbers2(2); numbers1(4);
      assert.deepEqual(result, [5, 6]);
    });
  });

  describe('of', function() {
    it('[ba11] can be accessed through the constructor property', function() {
      var s1 = stream(2);
      var s2 = s1.constructor.of(3);
      var s3 = s2.constructor['fantasy-land/of'](3);
      assert.equal(flyd.isStream(s2), true);
      assert.equal(s2(), 3);
      assert.equal(s3(), 3);
    });
    it('[263c] returns a stream with the passed value', function() {
      var s1 = stream(2);
      var s2 = s1.of(3);
      assert.equal(s2(), 3);
    });
    it('[4cab] has identity', function() {
      var a = stream();
      var id = function(a) { return a; };
      var v = stream(12);
      assert.equal(a.of(id).pipe(ap(v))(), v());
    });
    it('[81df] is homomorphic', function() {
      var a = stream(0);
      var f = function(x) { return 2 * x; };
      var x = 12;
      assert.equal(a.of(f).pipe(ap(a.of(x)))(), a.of(f(x))());
    });
    it('[10a7] is interchangeable', function() {
      var y = 7;
      var a = stream();
      var u = stream()(function(x) { return 3 * x; });
      assert.equal(u.pipe(ap(a.of(y)))(),
        a.of(function(f) { return f(y); }).pipe(ap(u))());
    });
  });
  describe('atomic updates', function() {
    it('[970e] does atomic updates', function() {
      var result = [];
      var a = stream(1);
      var b = combine(doubleFn, [a]);
      var c = combine(function(a) { return a + 4; }, [a]);
      combine(function(b, c) {
        result.push(b + c);
      }, [b, c]);
      a(2);
      assert.deepEqual(result, [7, 10]);
    });
    it('[49b0] does not glitch', function() {
      var result = [];
      var s1 = stream(1);
      var s1x2 = flyd.map(function(x) { return x * 2; }, s1);
      var s2 = combine(sumFn, [s1, s1x2]);
      var s1x4 = combine(sumFn, [s1, s2]);
      flyd.map(function(n) { result.push(n); }, s1x4);
      s1(2)(3)(4);
      assert.deepEqual(result, [4, 8, 12, 16]);
    });
    it('[b55d] handles complex dependency graph', function() {
      var result = [];
      var a = flyd.stream();
      var b = flyd.combine(function(a) { return a + 1; }, [a]);
      var c = flyd.combine(function(a) { return a + 2; }, [a]);
      var d = flyd.combine(function(c) { return c + 3; }, [c]);
      var e = flyd.combine(function(b, d) {
        return b + d;
      }, [b, d]);
      flyd.map(function(v) { result.push(v); }, e);
      a(1)(5)(11);
      assert.deepEqual(result, [8, 16, 28]);
    });
    it('[eec1] handles another complex dependency graph', function() {
      var result = [];
      var a = flyd.stream();
      var b = flyd.combine(function(a) { return a + 1; }, [a]);
      var c = flyd.combine(function(a) { return a + 2; }, [a]);
      var d = flyd.combine(function(a) { return a + 4; }, [a]);
      var e = flyd.combine(function(b, c, d) { return b + c + d; }, [b, c, d]);
      flyd.map(function(v) { result.push(v); }, e);
      a(1)(2)(3);
      assert.deepEqual(result, [10, 13, 16]);
    });
    it('[9303] nested streams atomic update', function() {
      var invocationCount = 0;
      var mapper = function(val) {
        invocationCount += 1;
        return val + 1;
      };
      stream(1).map(function() {
        stream(0)
        .map(mapper)
        .map(mapper);
      });
      assert.equal(invocationCount, 2);
    });
  });

  describe('fantasy-land', function() {
    it('[88d8] map', function() {
      var s = stream(1);
      var mapped = R.map(R.add(3), s);
      assert.equal(mapped(), 4);
      assert.equal(s(), 1);
    });

    it('[4f02] chain', function() {
      var s = stream(1);
      var chained = R.chain(R.compose(stream, R.add(3)), s);
      assert.equal(chained(), 4);
      assert.equal(s(), 1);
    });

    it('[9a4b] ap', function() {
      var s = stream(R.add(3));
      var val = stream(3);
      // ap applies a signal of functions to a signal of values.
      // ap :: Signal s => Signal (a → b) → a → b
      var applied = R.ap(s, val);
      assert.equal(applied(), 6);
    });

    it('[4727] of', function() {
      var s = flyd.stream(3);
      var s2 = s['fantasy-land/of'](5);
      assert(flyd.isStream(s));
      assert.equal(s(), 3);

      assert(flyd.isStream(s2));
      assert.equal(s2(), 5);
    })
  });
});