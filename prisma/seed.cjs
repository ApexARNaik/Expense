const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const members = [
    { name: 'Atul', color: 'blue' },
    { name: 'Affaan', color: 'green' },
    { name: 'Lalith', color: 'orange' },
  ]

  for (const m of members) {
    await prisma.member.upsert({
      where: { name: m.name },
      update: { color: m.color },
      create: {
        name: m.name,
        color: m.color,
      },
    })
  }
  console.log('Seeded members.')
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
