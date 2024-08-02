import assert from 'assert'

const expectError = (fn, message) => {
  try {
    fn()
    assert.fail('expected error not raised')
  } catch (err) {
    assert.strictEqual(err.message, message)
  }
}

export default expectError
