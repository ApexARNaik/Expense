import ExpenseForm from '@/components/ExpenseForm'
import prisma from '@/lib/db'
import { requireMember } from '@/lib/session'
import { notFound } from 'next/navigation'

export default async function EditExpensePage({ params }: { params: { id: string } }) {
  const currentMember = await requireMember()
  const { id } = await params
  
  const members = await prisma.member.findMany({
    orderBy: { name: 'asc' }
  })

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { shares: true }
  })

  if (!expense || expense.deletedAt) {
    notFound()
  }

  const initialData = {
    id: expense.id,
    title: expense.title,
    amountPaise: expense.amountPaise,
    expenseDate: expense.expenseDate,
    paidById: expense.paidById,
    category: expense.category || '',
    note: expense.note || '',
    participantIds: expense.shares.map(s => s.memberId),
    idempotencyKey: expense.idempotencyKey || undefined
  }

  return (
    <main className="p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Edit Expense</h1>
          <a href={`/expenses/${id}`} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">Cancel</a>
        </header>

        <ExpenseForm 
          initialData={initialData}
          members={members} 
          currentMemberId={currentMember.id} 
        />
      </div>
    </main>
  )
}
