import { test } from 'node:test'
import assert from 'node:assert'
import { parseAmountToPaise } from './money'

test('money parsing', () => {
  assert.strictEqual(parseAmountToPaise('19.99'), 1999)
  assert.strictEqual(parseAmountToPaise('0.29'), 29)
  assert.strictEqual(parseAmountToPaise('1.10'), 110)
  assert.strictEqual(parseAmountToPaise('1.1'), 110)
  assert.strictEqual(parseAmountToPaise('100'), 10000)
  assert.strictEqual(parseAmountToPaise('0.00'), 0)
  assert.strictEqual(parseAmountToPaise(''), 0)
})
