import { test } from 'node:test'
import assert from 'node:assert'
import { calculateShares } from './split'

test('100 split 3 ways gives 33.34 / 33.33 / 33.33 (alphabetical)', () => {
  const participants = [
    { id: '1', name: 'Atul' },
    { id: '2', name: 'Affaan' },
    { id: '3', name: 'Lalith' }
  ]
  
  const shares = calculateShares(100, participants)
  
  assert.strictEqual(shares['2'], 34) // Affaan
  assert.strictEqual(shares['1'], 33) // Atul
  assert.strictEqual(shares['3'], 33) // Lalith
  
  const sum = Object.values(shares).reduce((a, b) => a + b, 0)
  assert.strictEqual(sum, 100)
})

test('one participant gets all', () => {
  const participants = [{ id: '1', name: 'Atul' }]
  const shares = calculateShares(1234, participants)
  assert.strictEqual(shares['1'], 1234)
})

test('two participants with odd remainder', () => {
  const participants = [
    { id: '3', name: 'Lalith' },
    { id: '1', name: 'Atul' }
  ]
  const shares = calculateShares(451, participants)
  
  assert.strictEqual(shares['1'], 226) // Atul
  assert.strictEqual(shares['3'], 225) // Lalith
  
  const sum = Object.values(shares).reduce((a, b) => a + b, 0)
  assert.strictEqual(sum, 451)
})

test('sum invariant on randomized inputs', () => {
  const participants = [
    { id: 'a', name: 'Charlie' },
    { id: 'b', name: 'Alice' },
    { id: 'c', name: 'Bob' },
    { id: 'd', name: 'Zack' }
  ]
  
  for (let i = 0; i < 100; i++) {
    const amount = Math.floor(Math.random() * 10000) + 1
    const pCount = Math.floor(Math.random() * participants.length) + 1
    const subset = participants.slice(0, pCount)
    
    const shares = calculateShares(amount, subset)
    const sum = Object.values(shares).reduce((a, b) => a + b, 0)
    assert.strictEqual(sum, amount)
  }
})

test('-100 split 3 ways gives -34 / -33 / -33 (money received / guest reimbursement)', () => {
  const participants = [
    { id: '1', name: 'Atul' },
    { id: '2', name: 'Affaan' },
    { id: '3', name: 'Lalith' }
  ]
  
  const shares = calculateShares(-100, participants)
  
  assert.strictEqual(shares['2'], -34) // Affaan
  assert.strictEqual(shares['1'], -33) // Atul
  assert.strictEqual(shares['3'], -33) // Lalith
  
  const sum = Object.values(shares).reduce((a, b) => a + b, 0)
  assert.strictEqual(sum, -100)
})

test('sum invariant on randomized negative inputs (money received)', () => {
  const participants = [
    { id: 'a', name: 'Charlie' },
    { id: 'b', name: 'Alice' },
    { id: 'c', name: 'Bob' },
    { id: 'd', name: 'Zack' }
  ]
  
  for (let i = 0; i < 100; i++) {
    const amount = -(Math.floor(Math.random() * 10000) + 1)
    const pCount = Math.floor(Math.random() * participants.length) + 1
    const subset = participants.slice(0, pCount)
    
    const shares = calculateShares(amount, subset)
    const sum = Object.values(shares).reduce((a, b) => a + b, 0)
    assert.strictEqual(sum, amount)
  }
})
