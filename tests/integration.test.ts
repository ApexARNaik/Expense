import { test } from 'node:test'
import assert from 'node:assert'
import prisma from '../src/lib/db'
import { calculateShares } from '../src/lib/split'
import { encrypt } from '../src/lib/session'

const PORT = process.env.PORT || 3001

test('Integration: PRD 5.3 worked example', async () => {
  await prisma.expenseShare.deleteMany()
  await prisma.expense.deleteMany()
  
  await prisma.member.upsert({ where: { name: 'Atul' }, update: {}, create: { name: 'Atul', color: 'blue' }})
  await prisma.member.upsert({ where: { name: 'Affaan' }, update: {}, create: { name: 'Affaan', color: 'green' }})
  await prisma.member.upsert({ where: { name: 'Lalith' }, update: {}, create: { name: 'Lalith', color: 'orange' }})
  
  const atul = await prisma.member.findUnique({ where: { name: 'Atul' } })
  const affaan = await prisma.member.findUnique({ where: { name: 'Affaan' } })
  const lalith = await prisma.member.findUnique({ where: { name: 'Lalith' } })
  
  if (!atul || !affaan || !lalith) throw new Error('Members not seeded')
  

  
  const token = await encrypt({ name: atul.name })
  
  // Wi-Fi
  const res1 = await fetch(`http://127.0.0.1:${PORT}/api/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': `expense-session=${token}` },
    body: JSON.stringify({
      title: 'Wi-Fi', amountPaise: 90000, expenseDate: '2026-10-05', paidById: atul.id, participantIds: [atul.id, affaan.id, lalith.id]
    })
  })
  assert.strictEqual(res1.status, 200, await res1.text())

  // Dinner
  const res2 = await fetch(`http://127.0.0.1:${PORT}/api/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': `expense-session=${token}` },
    body: JSON.stringify({
      title: 'Dinner', amountPaise: 60000, expenseDate: '2026-10-05', paidById: affaan.id, participantIds: [atul.id, affaan.id]
    })
  })
  assert.strictEqual(res2.status, 200, await res2.text())

  // Razor
  const res3 = await fetch(`http://127.0.0.1:${PORT}/api/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': `expense-session=${token}` },
    body: JSON.stringify({
      title: 'Razor', amountPaise: 45000, expenseDate: '2026-10-05', paidById: atul.id, participantIds: [lalith.id]
    })
  })
  assert.strictEqual(res3.status, 200, await res3.text())
  
  const summaryRes = await fetch(`http://127.0.0.1:${PORT}/api/summary?from=2026-10-01&to=2026-10-31`, {
    headers: { 'Cookie': `expense-session=${token}` }
  })
  
  const summary = await summaryRes.json()
  
  assert.strictEqual(summary.totalHouseSpendPaise, 195000)
  
  const atulStats = summary.members.find((m: any) => m.id === atul.id)
  const affaanStats = summary.members.find((m: any) => m.id === affaan.id)
  const lalithStats = summary.members.find((m: any) => m.id === lalith.id)
  
  assert.strictEqual(atulStats.totalPaise, 60000)
  assert.strictEqual(affaanStats.totalPaise, 60000)
  assert.strictEqual(lalithStats.totalPaise, 75000)
  
  const sumBuckets = (buckets: any) => buckets.sharedWithEveryone + buckets.sharedWithSome + buckets.personalOnly
  assert.strictEqual(sumBuckets(atulStats.buckets), atulStats.totalPaise)
  assert.strictEqual(sumBuckets(affaanStats.buckets), affaanStats.totalPaise)
  assert.strictEqual(sumBuckets(lalithStats.buckets), lalithStats.totalPaise)

  // Verify paid vs owed
  assert.strictEqual(atulStats.totalPaidPaise, 135000)
  assert.strictEqual(atulStats.netBalancePaise, 75000) // Paid 1350 - Owed 600

  assert.strictEqual(affaanStats.totalPaidPaise, 60000)
  assert.strictEqual(affaanStats.netBalancePaise, 0) // Paid 600 - Owed 600

  assert.strictEqual(lalithStats.totalPaidPaise, 0)
  assert.strictEqual(lalithStats.netBalancePaise, -75000) // Paid 0 - Owed 750

  // Net balances must sum to 0
  const netSum = summary.members.reduce((acc: number, m: any) => acc + m.netBalancePaise, 0)
  assert.strictEqual(netSum, 0, 'Net balances must sum to exactly 0')
})

test('Integration: /api/expenses returns 401 without session', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/api/expenses`)
  assert.strictEqual(res.status, 401)
})
