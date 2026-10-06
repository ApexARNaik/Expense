import { test } from 'node:test'
import assert from 'node:assert'
import { parseAmountToPaise, formatPaiseToAmount, formatPaiseToIndianRupees } from './money'

test('money parsing', () => {
  assert.strictEqual(parseAmountToPaise('19.99'), 1999)
  assert.strictEqual(parseAmountToPaise('0.29'), 29)
  assert.strictEqual(parseAmountToPaise('1.10'), 110)
  assert.strictEqual(parseAmountToPaise('1.1'), 110)
  assert.strictEqual(parseAmountToPaise('100'), 10000)
  assert.strictEqual(parseAmountToPaise('0.00'), 0)
  assert.strictEqual(parseAmountToPaise(''), 0)
})

test('money formatting', () => {
  assert.strictEqual(formatPaiseToAmount(1999), '19.99')
  assert.strictEqual(formatPaiseToAmount(-1999), '-19.99')
  assert.strictEqual(formatPaiseToAmount(0), '0.00')

  assert.strictEqual(formatPaiseToIndianRupees(50000), '₹500.00')
  assert.strictEqual(formatPaiseToIndianRupees(-50000), '-₹500.00')
  assert.strictEqual(formatPaiseToIndianRupees(0), '₹0.00')
})
