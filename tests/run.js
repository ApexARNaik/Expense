const { execSync, spawn } = require('child_process')
const path = require('path')
const http = require('http')

process.env.DATABASE_URL = 'file:./test.db'
process.env.PORT = '3001'

if (!process.env.DATABASE_URL.includes('test.db')) {
  console.error('ERROR: DATABASE_URL must point to test.db to prevent data loss.')
  process.exit(1)
}

console.log('Pushing test schema...')
execSync('npx prisma@5 db push --accept-data-loss', { stdio: 'inherit' })

console.log('Starting Next.js with test.db on port 3001...')
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const server = spawn(npmCmd, ['run', 'dev', '--', '-p', '3001'], {
  stdio: 'ignore',
  shell: true,
  env: { ...process.env }
})

function checkServer() {
  return new Promise(resolve => {
    http.get('http://127.0.0.1:3001', res => {
      resolve(true)
    }).on('error', () => {
      resolve(false)
    })
  })
}

async function run() {
  console.log('Waiting for server...')
  for (let i = 0; i < 60; i++) {
    if (await checkServer()) break
    await new Promise(r => setTimeout(r, 1000))
  }
  
  console.log('Running tests...')
  try {
    execSync('npx tsx --test src/lib/split.test.ts src/lib/money.test.ts src/lib/periods.test.ts src/lib/settle.test.ts tests/integration.test.ts tests/uploads.test.ts', { stdio: 'inherit' })
  } catch (e) {
    server.kill()
    process.exit(1)
  }
  
  server.kill()
  process.exit(0)
}

run()
