'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatPaiseToIndianRupees } from '@/lib/money'
import { getPeriodRange } from '@/lib/periods'
import { calculateSettlements, Settlement } from '@/lib/settle'
import Link from 'next/link'

type MemberStats = {
  id: string
  totalPaise: number
  totalPaidPaise: number
  netBalancePaise: number
  buckets: {
    sharedWithEveryone: number
    sharedWithSome: number
    personalOnly: number
  }
}

type SummaryData = {
  period: { from: string, to: string }
  totalHouseSpendPaise: number
  members: MemberStats[]
}

type Member = { id: string, name: string, color: string }
type ExpenseInfo = {
  id: string
  title: string
  amountPaise: number
  expenseDate: string
  category?: string | null
  paidBy: { name: string }
  shares: { member: { name: string, color: string } }[]
}

export default function Dashboard({ initialMembers }: { initialMembers: Member[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [period, setPeriodState] = useState(searchParams.get('period') || 'this_month')
  
  const setPeriod = (newPeriod: string) => {
    setPeriodState(newPeriod)
    const params = new URLSearchParams(searchParams)
    params.set('period', newPeriod)
    router.replace(`/?${params.toString()}`, { scroll: false })
  }
  
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [recent, setRecent] = useState<ExpenseInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const { from, to } = getPeriodRange(period)
        const [summaryRes, expensesRes] = await Promise.all([
          fetch(`/api/summary?from=${from}&to=${to}`),
          fetch(`/api/expenses`) // for recent expenses
        ])
        
        if (summaryRes.ok) {
          const data = await summaryRes.json()
          setSummary(data)
        }
        
        if (expensesRes.ok) {
          const data = await expensesRes.json()
          // Only take top 3
          setRecent(data.expenses.slice(0, 3))
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [period])

  return (
    <div className="space-y-6 pb-20 relative">
      
      {/* Period Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex gap-2 overflow-x-auto snap-x no-scrollbar border border-gray-100 dark:border-gray-700/60">
        {['this_month', 'last_month', 'all_time'].map(p => (
          <button 
            key={p}
            onClick={() => setPeriod(p)}
            className={`snap-start whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              period === p ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {p === 'this_month' ? 'This month' : p === 'last_month' ? 'Last month' : 'All time'}
          </button>
        ))}
        <input 
          type="month"
          value={period.includes('-') ? period : ''}
          onChange={(e) => {
            if (e.target.value) setPeriod(e.target.value)
          }}
          className={`snap-start whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
            period.includes('-') ? 'bg-gray-900 text-white border-transparent dark:bg-gray-100 dark:text-gray-900' : 'bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        />
      </div>

      {loading ? (
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-3xl"></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
          </div>
        </div>
      ) : summary ? (
        <>
          {/* Total Spend */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 text-center border border-gray-100 dark:border-gray-700/60">
            <h2 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Total Net House Spend</h2>
            <div className="text-4xl font-light text-gray-900 dark:text-gray-100 tracking-tight">
              {formatPaiseToIndianRupees(summary.totalHouseSpendPaise)}
            </div>
            {summary.totalHouseSpendPaise === 0 && (
              <p className="mt-4 text-gray-500 dark:text-gray-400">No expenses in this period.</p>
            )}
          </div>

          {/* Member Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {initialMembers.map(member => {
              const stats = summary.members.find(m => m.id === member.id)
              const total = stats ? stats.totalPaise : 0
              const isExpanded = expandedCard === member.id
              
              return (
                <div 
                  key={member.id} 
                  onClick={() => setExpandedCard(isExpanded ? null : member.id)}
                  className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 cursor-pointer transition-all border-l-4 overflow-hidden border border-gray-100 dark:border-gray-700/60`}
                  style={{ borderLeftColor: member.color }}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{member.name}</h3>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {formatPaiseToIndianRupees(total)}
                    </div>
                  </div>

                  {stats && (
                    <div className="mt-2 flex gap-4 text-xs font-medium uppercase tracking-wide">
                      <div className="flex flex-col">
                        <span className="text-gray-400 dark:text-gray-500">Paid/Recv Net</span>
                        <span className="text-gray-900 dark:text-gray-100">{formatPaiseToIndianRupees(stats.totalPaidPaise)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-400 dark:text-gray-500">Net Balance</span>
                        <span className={stats.netBalancePaise > 0 ? 'text-green-600 dark:text-green-500 font-bold' : stats.netBalancePaise < 0 ? 'text-red-600 dark:text-red-500 font-bold' : 'text-gray-900 dark:text-gray-100'}>
                          {stats.netBalancePaise > 0 ? '+' : ''}{formatPaiseToIndianRupees(stats.netBalancePaise)}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {isExpanded && stats && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Shared w/ Everyone</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{formatPaiseToIndianRupees(stats.buckets.sharedWithEveryone)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Shared w/ Some</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{formatPaiseToIndianRupees(stats.buckets.sharedWithSome)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Personal Only</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{formatPaiseToIndianRupees(stats.buckets.personalOnly)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Settle Up Section */}
          {(() => {
            const balances = summary.members.map(m => ({
              id: m.id,
              name: initialMembers.find(mem => mem.id === m.id)?.name || 'Unknown',
              netBalancePaise: m.netBalancePaise
            }))
            const settlements = calculateSettlements(balances)
            return (
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 border border-gray-100 dark:border-gray-700/60">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Settle up</h2>
                  <Link 
                    href="/expenses/new?mode=settle" 
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    + Record Transfer
                  </Link>
                </div>
                
                {settlements.length === 0 ? (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl text-center">
                    <span className="text-2xl">🎉</span>
                    <p className="text-emerald-800 dark:text-emerald-300 font-medium text-sm mt-1">All settled for this period!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {settlements.map((s, i) => (
                      <div key={i} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          <span className="font-semibold text-gray-900 dark:text-gray-100">{s.fromName}</span> pays <span className="font-semibold text-gray-900 dark:text-gray-100">{s.toName}</span>
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-900 dark:text-gray-100">
                            {formatPaiseToIndianRupees(s.amountPaise)}
                          </span>
                          <Link
                            href={`/expenses/new?mode=settle&payer=${s.fromId}&receiver=${s.toId}&amount=${(s.amountPaise / 100).toFixed(2)}`}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1"
                          >
                            <span>🤝</span>
                            <span>Settle</span>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}
        </>
      ) : (
        <div className="text-center p-8 text-gray-500">Failed to load summary.</div>
      )}

      {/* Recent Expenses Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 border border-gray-100 dark:border-gray-700/60">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Recent</h2>
          <Link href="/expenses" className="text-blue-600 font-medium text-sm hover:underline">
            View all →
          </Link>
        </div>
        
        {recent.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No transactions yet.</p>
        ) : (
          <div className="space-y-4">
            {recent.map(expense => {
              const isIncome = expense.amountPaise < 0
              const isSettle = expense.category === 'Settlement' || expense.category === 'Debt Payment'
              const receiverMember = expense.shares?.[0]?.member

              return (
                <Link key={expense.id} href={`/expenses/${expense.id}`} className="block group">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{expense.title}</h3>
                        {isSettle ? (
                          <span className="text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                            🤝 Settlement
                          </span>
                        ) : isIncome ? (
                          <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                            + Received
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {isSettle 
                          ? `${expense.paidBy.name} paid ${receiverMember?.name || 'flatmate'}`
                          : isIncome 
                            ? `Received by ${expense.paidBy.name}` 
                            : `Paid by ${expense.paidBy.name}`}
                      </div>
                    </div>
                    <div className={`font-semibold ${
                      isSettle
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : isIncome 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {isIncome ? `+${formatPaiseToIndianRupees(Math.abs(expense.amountPaise))}` : formatPaiseToIndianRupees(expense.amountPaise)}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      <Link 
        href="/expenses/new"
        className="fixed bottom-6 right-6 h-14 w-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-600/30 transition-transform active:scale-95 z-50 text-3xl font-light pb-1"
      >
        +
      </Link>
    </div>
  )
}
