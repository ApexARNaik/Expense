import prisma from '@/lib/db'
import { requireMember } from '@/lib/session'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import DeleteExpenseButton from '@/components/DeleteExpenseButton'
import ReceiptViewer from '@/components/ReceiptViewer'
import { ThemeToggle } from '@/components/ThemeToggle'
import { revalidatePath } from 'next/cache'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireMember()
  const { id } = await params

  async function stopRecurringAction() {
    'use server'
    await prisma.expense.update({
      where: { id },
      data: { recurrenceStatus: 'STOPPED' }
    })
    revalidatePath(`/expenses/${id}`)
  }

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      paidBy: true,
      createdBy: true,
      updatedBy: true,
      shares: {
        include: { member: true },
        orderBy: { member: { name: 'asc' } }
      }
    }
  })

  if (!expense || expense.deletedAt) {
    notFound()
  }

  const isIncome = expense.amountPaise < 0
  const isSettle = expense.category === 'Settlement' || expense.category === 'Debt Payment'
  const absAmount = Math.abs(expense.amountPaise)
  const receiverMember = expense.shares?.[0]?.member

  return (
    <main className="p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <Link href="/expenses" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 font-medium transition-colors">
            ← Back
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href={`/expenses/${id}/edit`} className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-2 rounded-lg font-medium transition-colors">
              Edit
            </Link>
            <DeleteExpenseButton id={id} />
          </div>
        </header>

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 space-y-6 border border-gray-100 dark:border-gray-700/60">
          <div className="text-center pb-6 border-b border-gray-100 dark:border-gray-700">
            {isSettle ? (
              <div className="mb-3 inline-block px-3 py-1 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-semibold">
                🤝 Debt Settlement / Transfer
              </div>
            ) : isIncome ? (
              <div className="mb-3 inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-semibold">
                💵 Money Received / Guest Payment
              </div>
            ) : null}

            {expense.isRecurring && (
              <div className="mb-3 flex justify-center items-center gap-2">
                <div className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold">
                  🔄 Monthly Recurring ({expense.recurrenceStatus})
                </div>
                {expense.recurrenceStatus === 'ACTIVE' && (
                  <form action={stopRecurringAction}>
                    <button type="submit" className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-full px-3 py-1 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                      Stop
                    </button>
                  </form>
                )}
              </div>
            )}

            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{expense.title}</h1>
            <div className={`text-4xl font-light tracking-tight mb-4 ${
              isSettle 
                ? 'text-indigo-600 dark:text-indigo-400' 
                : isIncome 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-gray-900 dark:text-gray-100'
            }`}>
              {isIncome ? '+₹' : '₹'}{(absAmount / 100).toFixed(2)}
            </div>
            <div className="text-gray-500 dark:text-gray-400 text-sm flex items-center justify-center gap-2">
              <span>{formatDate(expense.expenseDate)}</span>
              <span>•</span>
              <span>
                {isSettle ? (
                  <>
                    <strong className="text-gray-700 dark:text-gray-300">{expense.paidBy.name}</strong> paid <strong className="text-gray-700 dark:text-gray-300">{receiverMember?.name || 'flatmate'}</strong>
                  </>
                ) : isIncome ? (
                  <>
                    Received by <strong className="text-gray-700 dark:text-gray-300">{expense.paidBy.name}</strong>
                  </>
                ) : (
                  <>
                    Paid by <strong className="text-gray-700 dark:text-gray-300">{expense.paidBy.name}</strong>
                  </>
                )}
              </span>
            </div>
            {expense.category && (
              <div className="mt-4 inline-block px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs font-semibold">
                {expense.category}
              </div>
            )}
            {expense.note && (
              <div className="mt-4 text-gray-600 dark:text-gray-400 italic">"{expense.note}"</div>
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
              {isSettle ? 'Settlement Details' : isIncome ? 'Credit Distribution' : 'Split Details'}
            </h2>
            <div className="space-y-3">
              {expense.shares.map(share => {
                const absShare = Math.abs(share.sharePaise)
                return (
                  <div key={`${share.expenseId}-${share.memberId}`} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center gap-3">
                      <div 
                        className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
                        style={{ backgroundColor: share.member.color }}
                      >
                        {share.member.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-medium text-gray-800 dark:text-gray-200">{share.member.name}</span>
                        {isSettle && <span className="text-xs text-gray-400 dark:text-gray-500 block">Received payment</span>}
                      </div>
                    </div>
                    <div className={`font-semibold ${
                      isSettle
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : isIncome 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {isIncome ? '+₹' : '₹'}{(absShare / 100).toFixed(2)} {isIncome ? <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(credit)</span> : isSettle ? <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(cleared)</span> : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500 text-center space-y-1">
            <div>Added by {expense.createdBy.name} on {new Date(expense.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</div>
            {expense.updatedBy && expense.updatedAt > expense.createdAt && (
              <div>Edited by {expense.updatedBy.name} on {new Date(expense.updatedAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</div>
            )}
          </div>
          
          {expense.imageUrl && <ReceiptViewer imageUrl={expense.imageUrl} />}
        </div>
      </div>
    </main>
  )
}
