import { Suspense } from 'react'
import { requireMember } from '@/lib/session'
import Link from 'next/link'
import ExpenseList from '@/components/ExpenseList'
import { ThemeToggle } from '@/components/ThemeToggle'
import prisma from '@/lib/db'

export default async function ExpenseListPage() {
  await requireMember()
  const members = await prisma.member.findMany({ orderBy: { name: 'asc' } })

  return (
    <main className="p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
              ← Back
            </Link>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Expenses</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/expenses/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full font-medium transition-colors shadow-sm">
              + Add
            </Link>
          </div>
        </header>

        <Suspense fallback={<div className="animate-pulse h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />}>
          <ExpenseList members={members} />
        </Suspense>
      </div>
    </main>
  )
}
