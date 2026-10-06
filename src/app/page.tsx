import prisma from '@/lib/db'
import { requireMember } from '@/lib/session'
import Dashboard from '@/components/Dashboard'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'

export default async function HomePage() {
  const currentMember = await requireMember()
  if (!currentMember) {
    redirect('/login')
  }

  const members = await prisma.member.findMany({
    orderBy: { name: 'asc' }
  })

  return (
    <main className="p-4 pt-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-6 px-2">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Flat Expense Tracker</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <form action="/api/logout" method="POST">
              <button type="submit" className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                Log Out
              </button>
            </form>
          </div>
        </header>

        <Suspense fallback={<div className="animate-pulse h-64 bg-gray-200 dark:bg-gray-800 rounded-3xl" />}>
          <Dashboard initialMembers={members} />
        </Suspense>
      </div>
    </main>
  )
}
