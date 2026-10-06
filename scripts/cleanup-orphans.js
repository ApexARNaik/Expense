const fs = require('fs/promises')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads')
const MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours

async function main() {
  console.log('Starting orphan cleanup...')
  
  try {
    const files = await fs.readdir(UPLOAD_DIR)
    
    // Fetch all used images
    const expenses = await prisma.expense.findMany({
      where: { imageUrl: { not: null } },
      select: { imageUrl: true }
    })
    
    const usedImages = new Set(expenses.map(e => e.imageUrl))
    let deletedCount = 0

    for (const file of files) {
      if (usedImages.has(file)) continue
      
      const filePath = path.join(UPLOAD_DIR, file)
      const stats = await fs.stat(filePath)
      
      const age = Date.now() - stats.mtimeMs
      if (age > MAX_AGE_MS) {
        await fs.unlink(filePath)
        console.log(`Deleted orphan: ${file}`)
        deletedCount++
      }
    }
    
    console.log(`Cleanup complete. Deleted ${deletedCount} orphans.`)
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('Uploads directory does not exist yet.')
    } else {
      console.error('Error during cleanup:', error)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main()
