import assert from 'node:assert'
import { describe, it } from 'mocha'
import Signal from '../lib/index.js'

describe('Signal.toJSON', function () {
  it('[8a4a] toJSON :: Signal s -> JSON', function() {
    const object = {
      num: Signal.of(23),
      str: Signal.of('string'),
      obj: Signal.of({ is_object: true })
    }

    const expected = {
      num: 23,
      str: 'string',
      obj: {
        is_object: true
      }
    }

    const actual = JSON.parse(JSON.stringify(object))
    assert.deepEqual(actual, expected)
  })
})
