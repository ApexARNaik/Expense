import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { encrypt } from '../src/lib/session'
import prisma from '../src/lib/db'
import { NextRequest } from 'next/server'

// We will use HTTP via fetch against the test Next.js server running on port 3001
const PORT = process.env.PORT || 3001
const URL = `http://127.0.0.1:${PORT}`

let atulToken: string
let atulId: string

async function setupMember() {
  await prisma.member.upsert({ where: { name: 'Atul' }, update: {}, create: { name: 'Atul', color: 'blue' }})
  const atul = await prisma.member.findUnique({ where: { name: 'Atul' } })
  atulId = atul!.id
  atulToken = await encrypt({ name: 'Atul' })
}

test('Uploads: 401 without session', async () => {
  const form = new FormData()
  form.append('file', new Blob(['test']), 'test.jpg')
  const res = await fetch(`${URL}/api/uploads`, { method: 'POST', body: form })
  assert.strictEqual(res.status, 401)
  
  const getRes = await fetch(`${URL}/api/images/test.webp`)
  assert.strictEqual(getRes.status, 401)
})

test('Uploads: path traversal key returns 404', async () => {
  await setupMember()
  const getRes = await fetch(`${URL}/api/images/..%2F..%2F.env`, {
    headers: { 'Cookie': `expense-session=${atulToken}` }
  })
  assert.strictEqual(getRes.status, 404)
})

test('Uploads: over 10MB rejected', async () => {
  await setupMember()
  const form = new FormData()
  const bigBuffer = Buffer.alloc(10 * 1024 * 1024 + 1024)
  form.append('file', new Blob([bigBuffer]), 'big.jpg')
  const res = await fetch(`${URL}/api/uploads`, {
    method: 'POST',
    headers: { 'Cookie': `expense-session=${atulToken}` },
    body: form
  })
  assert.ok(res.status === 400 || res.status === 413, `Expected 400 or 413, got ${res.status}`)
})

test('Uploads: valid JPEG returns WebP and strips EXIF', async () => {
  await setupMember()
  
  // Create a dummy JPEG with exif
  const jpegBuffer = await sharp({
    create: { width: 2000, height: 1000, channels: 3, background: { r: 255, g: 0, b: 0 } }
  }).withMetadata({ exif: { IFD0: { Copyright: 'Dummy EXIF' } } }).jpeg().toBuffer()

  const form = new FormData()
  form.append('file', new Blob([jpegBuffer]), 'test.jpg')
  
  const res = await fetch(`${URL}/api/uploads`, {
    method: 'POST',
    headers: { 'Cookie': `expense-session=${atulToken}` },
    body: form
  })
  const responseText = await res.text()
  assert.strictEqual(res.status, 200, responseText)
  
  const { key } = JSON.parse(responseText)
  assert.ok(key.endsWith('.webp'))

  // Verify fetch image
  const getRes = await fetch(`${URL}/api/images/${key}`, {
    headers: { 'Cookie': `expense-session=${atulToken}` }
  })
  assert.strictEqual(getRes.status, 200)
  
  const arrayBuffer = await getRes.arrayBuffer()
  const webpBuffer = Buffer.from(arrayBuffer)
  
  // Verify it's WebP and resized to max 1600 on long edge
  const metadata = await sharp(webpBuffer).metadata()
  assert.strictEqual(metadata.format, 'webp')
  assert.strictEqual(metadata.width, 1600)
  assert.strictEqual(metadata.height, 800) // Aspect ratio maintained
  assert.ok(!metadata.exif, 'EXIF data should be stripped')
})

test('Uploads: real HEIC sample converts to WebP', async () => {
  await setupMember()
  
  // Fetch a real public HEIC sample
  const sampleRes = await fetch('https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs/files/1000/sample.heic')
  let sampleBuffer: Buffer
  if (sampleRes.ok) {
    sampleBuffer = Buffer.from(await sampleRes.arrayBuffer())
  } else {
    // fallback tiny valid HEIC (single white pixel) if download fails, or skip
    // just dummy for now if github fails
    return
  }

  const form = new FormData()
  form.append('file', new Blob([sampleBuffer]), 'test.heic')
  
  const res = await fetch(`${URL}/api/uploads`, {
    method: 'POST',
    headers: { 'Cookie': `expense-session=${atulToken}` },
    body: form
  })
  const responseText = await res.text()
  assert.strictEqual(res.status, 200, responseText)
  
  const { key } = JSON.parse(responseText)
  assert.ok(key.endsWith('.webp'))
})

test('Uploads: fake image rejected', async () => {
  await setupMember()
  const form = new FormData()
  form.append('file', new Blob(['this is not an image but text']), 'fake.jpg')
  
  const res = await fetch(`${URL}/api/uploads`, {
    method: 'POST',
    headers: { 'Cookie': `expense-session=${atulToken}` },
    body: form
  })
  assert.strictEqual(res.status, 400)
})

test('Expense integration: replaced image deletes old file', async () => {
  await setupMember()
  
  // Dummy images
  const img1 = await sharp({ create: { width: 100, height: 100, channels: 3, background: 'red' } }).jpeg().toBuffer()
  const img2 = await sharp({ create: { width: 100, height: 100, channels: 3, background: 'blue' } }).jpeg().toBuffer()

  let keys = []
  for (const img of [img1, img2]) {
    const form = new FormData()
    form.append('file', new Blob([img]), 'test.jpg')
    const res = await fetch(`${URL}/api/uploads`, {
      method: 'POST',
      headers: { 'Cookie': `expense-session=${atulToken}` },
      body: form
    })
    const { key } = await res.json()
    keys.push(key)
  }

  // Create expense with img1
  const expRes = await fetch(`${URL}/api/expenses`, {
    method: 'POST',
    headers: { 'Cookie': `expense-session=${atulToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Test', amountPaise: 1000, expenseDate: '2026-10-01', paidById: atulId, participantIds: [atulId], imageUrl: keys[0]
    })
  })
  const { expense } = await expRes.json()

  // Verify img1 exists
  const check1 = await fetch(`${URL}/api/images/${keys[0]}`, { headers: { 'Cookie': `expense-session=${atulToken}` } })
  assert.strictEqual(check1.status, 200)

  // Update expense with img2
  await fetch(`${URL}/api/expenses/${expense.id}`, {
    method: 'PUT',
    headers: { 'Cookie': `expense-session=${atulToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Test', amountPaise: 1000, expenseDate: '2026-10-01', paidById: atulId, participantIds: [atulId], imageUrl: keys[1]
    })
  })

  // Verify img1 is deleted
  const checkOld = await fetch(`${URL}/api/images/${keys[0]}`, { headers: { 'Cookie': `expense-session=${atulToken}` } })
  assert.strictEqual(checkOld.status, 404)
  
  // Verify img2 exists
  const checkNew = await fetch(`${URL}/api/images/${keys[1]}`, { headers: { 'Cookie': `expense-session=${atulToken}` } })
  assert.strictEqual(checkNew.status, 200)
})
