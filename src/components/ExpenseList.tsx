'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatPaiseToIndianRupees } from '@/lib/money'
import { getPeriodRange } from '@/lib/periods'

type Member = { id: string, name: string, color: string }

export default function ExpenseList({ members }: { members: Member[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [participant, setParticipant] = useState(searchParams.get('participant') || '')
  const [paidBy, setPaidBy] = useState(searchParams.get('paidBy') || '')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [period, setPeriod] = useState(searchParams.get('period') || 'all_time')

  const [expenses, setExpenses] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  
  // Update URL on filter change
  useEffect(() => {
    const params = new URLSearchParams()
    if (participant) params.set('participant', participant)
    if (paidBy) params.set('paidBy', paidBy)
    if (category) params.set('category', category)
    if (search) params.set('search', search)
    if (period && period !== 'all_time') params.set('period', period)
    
    router.replace(`/expenses?${params.toString()}`, { scroll: false })
  }, [participant, paidBy, category, search, period, router])

  const fetchExpenses = async (pageNum: number, append = false) => {
    const params = new URLSearchParams()
    params.set('page', pageNum.toString())
    if (participant) params.set('participant', participant)
    if (paidBy) params.set('paidBy', paidBy)
    if (category) params.set('category', category)
    if (search) params.set('search', search)
    
    if (period && period !== 'all_time') {
      const { from, to } = getPeriodRange(period)
      params.set('from', from)
      params.set('to', to)
    }

    try {
      const res = await fetch(`/api/expenses?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        if (append) {
          setExpenses(prev => [...prev, ...data.expenses])
        } else {
          setExpenses(data.expenses)
        }
        setHasMore(data.pagination.page < data.pagination.pages)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // Reload when filters change
  useEffect(() => {
    setLoading(true)
    setPage(1)
    fetchExpenses(1, false)
  }, [participant, paidBy, category, search, period])

  const loadMore = () => {
    if (hasMore && !loadingMore) {
      setLoadingMore(true)
      const nextPage = page + 1
      setPage(nextPage)
      fetchExpenses(nextPage, true)
    }
  }

  const clearFilters = () => {
    setParticipant('')
    setPaidBy('')
    setCategory('')
    setSearch('')
    setPeriod('all_time')
  }

  const hasFilters = participant || paidBy || category || search || period !== 'all_time'

  return (
    <div className="space-y-4 pb-12">
      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="text"
            placeholder="Search titles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[140px] px-3 py-2 bg-gray-50 dark:bg-gray-700 border-transparent focus:bg-white dark:focus:bg-gray-600 rounded-lg text-sm border focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
          <select 
            value={period} 
            onChange={e => setPeriod(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm border-transparent focus:bg-white dark:focus:bg-gray-600 focus:border-blue-500 transition-colors text-gray-900 dark:text-gray-100"
          >
            <option value="all_time">All Time</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
          </select>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          <select 
            value={paidBy} 
            onChange={e => setPaidBy(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm border-transparent focus:bg-white dark:focus:bg-gray-600 focus:border-blue-500 transition-colors text-gray-900 dark:text-gray-100"
          >
            <option value="">Any Payer</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>

          <select 
            value={participant} 
            onChange={e => setParticipant(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm border-transparent focus:bg-white dark:focus:bg-gray-600 focus:border-blue-500 transition-colors text-gray-900 dark:text-gray-100"
          >
            <option value="">Any Participant</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>

          {hasFilters && (
            <button onClick={clearFilters} className="text-sm font-medium text-blue-600 dark:text-blue-400 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
        {loading && expenses.length === 0 ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500 animate-pulse">Loading expenses...</div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
            <span className="text-3xl mb-3 opacity-50">💸</span>
            <p>No expenses found.</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-2 text-blue-600 dark:text-blue-400 text-sm hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          expenses.map(expense => (
            <Link key={expense.id} href={`/expenses/${expense.id}`} className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{expense.title}</h3>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                    <span>{new Date(expense.expenseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span>•</span>
                    <span>Paid by {expense.paidBy.name}</span>
                  </div>
                  <div className="flex -space-x-1.5 mt-2">
                    {expense.shares.map((share: any) => (
                      <div 
                        key={share.memberId} 
                        title={share.member.name}
                        className="h-5 w-5 rounded-full ring-2 ring-white dark:ring-gray-800 text-[10px] flex items-center justify-center text-white"
                        style={{ backgroundColor: share.member.color }}
                      >
                        {share.member.name.charAt(0)}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatPaiseToIndianRupees(expense.amountPaise)}
                  </div>
                  {expense.imageUrl && (
                    <span className="text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded mt-1 inline-block">
                      Receipt
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button 
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-full shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
