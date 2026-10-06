import { test } from 'node:test'
import assert from 'node:assert'
import { calculateSettlements } from './settle'

test('Settlements: exact amounts and determinism', () => {
  const balances = [
    { id: '1', name: 'Atul', netBalancePaise: -3300 },
    { id: '2', name: 'Lalith', netBalancePaise: 4200 },
    { id: '3', name: 'Affaan', netBalancePaise: -900 }
  ]

  const settlements = calculateSettlements(balances)
  
  assert.strictEqual(settlements.length, 2)
  
  // Sorted by net balance: Atul (-3300), Affaan (-900), Lalith (4200)
  // Step 1: Atul pays 3300 to Lalith. Atul=0, Lalith=900
  // Step 2: Affaan pays 900 to Lalith. Affaan=0, Lalith=0

  assert.strictEqual(settlements[0].fromName, 'Atul')
  assert.strictEqual(settlements[0].toName, 'Lalith')
  assert.strictEqual(settlements[0].amountPaise, 3300)

  assert.strictEqual(settlements[1].fromName, 'Affaan')
  assert.strictEqual(settlements[1].toName, 'Lalith')
  assert.strictEqual(settlements[1].amountPaise, 900)
})

test('Settlements: zero balances are skipped', () => {
  const balances = [
    { id: '1', name: 'A', netBalancePaise: 0 },
    { id: '2', name: 'B', netBalancePaise: -100 },
    { id: '3', name: 'C', netBalancePaise: 100 }
  ]
  const settlements = calculateSettlements(balances)
  assert.strictEqual(settlements.length, 1)
  assert.strictEqual(settlements[0].fromName, 'B')
  assert.strictEqual(settlements[0].toName, 'C')
})

test('Settlements: all settled', () => {
  const balances = [
    { id: '1', name: 'A', netBalancePaise: 0 },
    { id: '2', name: 'B', netBalancePaise: 0 },
    { id: '3', name: 'C', netBalancePaise: 0 }
  ]
  const settlements = calculateSettlements(balances)
  assert.strictEqual(settlements.length, 0)
})

test('Settlements: guest meal payment received by one member and split 3 ways', () => {
  // Guest paid 60000 paise (Rs 600) to Atul.
  // Split 3 ways means Rs 200 credit each.
  // Atul: paid -60000, share -20000 -> netBalance = -40000 (owes 400 to flatmates)
  // Affaan: paid 0, share -20000 -> netBalance = +20000 (is owed 200)
  // Lalith: paid 0, share -20000 -> netBalance = +20000 (is owed 200)
  const balances = [
    { id: '1', name: 'Atul', netBalancePaise: -40000 },
    { id: '2', name: 'Affaan', netBalancePaise: 20000 },
    { id: '3', name: 'Lalith', netBalancePaise: 20000 }
  ]
  const settlements = calculateSettlements(balances)
  assert.strictEqual(settlements.length, 2)
  assert.strictEqual(settlements[0].fromName, 'Atul')
  assert.strictEqual(settlements[0].toName, 'Lalith')
  assert.strictEqual(settlements[0].amountPaise, 20000)

  assert.strictEqual(settlements[1].fromName, 'Atul')
  assert.strictEqual(settlements[1].toName, 'Affaan')
  assert.strictEqual(settlements[1].amountPaise, 20000)
})
