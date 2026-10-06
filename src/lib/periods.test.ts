import { test } from 'node:test'
import assert from 'node:assert'
import { getPeriodRange } from './periods'

test('all_time', () => {
  const { from, to } = getPeriodRange('all_time')
  assert.strictEqual(from, '1970-01-01')
  assert.strictEqual(to, '2099-12-31')
})

test('specific month', () => {
  const { from, to } = getPeriodRange('2026-02')
  assert.strictEqual(from, '2026-02-01')
  assert.strictEqual(to, '2026-02-28')
})

test('specific month leap year', () => {
  const { from, to } = getPeriodRange('2024-02')
  assert.strictEqual(from, '2024-02-01')
  assert.strictEqual(to, '2024-02-29')
})

test('specific month across year change (December)', () => {
  const { from, to } = getPeriodRange('2025-12')
  assert.strictEqual(from, '2025-12-01')
  assert.strictEqual(to, '2025-12-31')
})
