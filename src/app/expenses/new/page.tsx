import ExpenseForm from '@/components/ExpenseForm'
import prisma from '@/lib/db'
import { requireMember } from '@/lib/session'

export default async function NewExpensePage() {
  const currentMember = await requireMember()
  
  const members = await prisma.member.findMany({
    orderBy: { name: 'asc' }
  })

  return (
    <main className="p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">New Expense</h1>
          <a href="/expenses" className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">Cancel</a>
        </header>

        <ExpenseForm 
          members={members} 
          currentMemberId={currentMember.id} 
        />
      </div>
    </main>
  )
}
