'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { parseAmountToPaise, formatPaiseToAmount } from '@/lib/money'

type Member = { id: string, name: string, color: string }
type ExpenseData = {
  id?: string
  title: string
  amountPaise: number
  expenseDate: string
  paidById: string
  category: string
  note: string
  participantIds: string[]
  idempotencyKey?: string
  imageUrl?: string | null
}

const EXPENSE_CATEGORIES = ['Groceries', 'Food and Dining', 'Rent', 'Utilities', 'Household', 'Internet', 'Furniture', 'Other']
const INCOME_CATEGORIES = ['Guest Food / Meals', 'Guest Reimbursement', 'Refund / Credit', 'Other']

export default function ExpenseForm({ initialData, members, currentMemberId }: { initialData?: ExpenseData, members: Member[], currentMemberId: string }) {
  const router = useRouter()
  
  const isInitialIncome = initialData ? initialData.amountPaise < 0 : false
  const [mode, setMode] = useState<'expense' | 'income'>(isInitialIncome ? 'income' : 'expense')

  const [title, setTitle] = useState(initialData?.title || '')
  const [amountInput, setAmountInput] = useState(initialData ? formatPaiseToAmount(Math.abs(initialData.amountPaise)) : '')
  const [date, setDate] = useState(initialData?.expenseDate || new Date().toISOString().split('T')[0])
  const [paidById, setPaidById] = useState(initialData?.paidById || currentMemberId)
  const [category, setCategory] = useState(initialData?.category || (isInitialIncome ? 'Guest Food / Meals' : ''))
  const [note, setNote] = useState(initialData?.note || '')
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.imageUrl ? `/api/images/${initialData.imageUrl}` : null)
  
  // Participants selection: 'All', or set of specific member IDs
  const allMemberIds = members.map(m => m.id)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(initialData?.participantIds || allMemberIds)
  )

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [idempotencyKey] = useState(initialData?.idempotencyKey || uuidv4())

  const isAll = selectedIds.size === members.length
  const isIncome = mode === 'income'

  const handleModeChange = (newMode: 'expense' | 'income') => {
    setMode(newMode)
    if (newMode === 'income' && (!category || EXPENSE_CATEGORIES.includes(category))) {
      setCategory('Guest Food / Meals')
    } else if (newMode === 'expense' && (category === 'Guest Food / Meals' || category === 'Guest Reimbursement')) {
      setCategory('Groceries')
    }
  }

  const handleToggleMember = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  const handleToggleAll = () => {
    if (isAll) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allMemberIds))
    }
  }

  const handleAmountKey = (key: string) => {
    if (key === 'backspace') {
      setAmountInput(prev => prev.slice(0, -1))
      return
    }
    if (key === '.' && amountInput.includes('.')) return
    
    const parts = amountInput.split('.')
    if (parts.length === 2 && parts[1].length >= 2 && key !== 'backspace') return // Max 2 decimals
    
    setAmountInput(prev => prev + key)
  }

  const rawPaise = parseAmountToPaise(amountInput)
  const finalAmountPaise = isIncome ? -rawPaise : rawPaise
  const previewShare = rawPaise > 0 && selectedIds.size > 0 
    ? formatPaiseToAmount(Math.floor(rawPaise / selectedIds.size)) // approx
    : '0.00'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedIds.size === 0) {
      setError(isIncome ? 'Select at least one flatmate to credit' : 'Select at least one person to split with')
      return
    }
    if (rawPaise <= 0) {
      setError('Amount must be greater than 0')
      return
    }
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setLoading(true)
    setError('')
    setUploadError('')

    let finalImageUrl = imageUrl

    if (imageFile) {
      const formData = new FormData()
      formData.append('file', imageFile)
      
      try {
        const uploadRes = await fetch('/api/uploads', {
          method: 'POST',
          body: formData
        })
        
        if (!uploadRes.ok) {
          const uErr = await uploadRes.json()
          setUploadError(uErr.error || 'Failed to upload image')
          setLoading(false)
          return
        }
        
        const uploadData = await uploadRes.json()
        finalImageUrl = uploadData.key
      } catch (err) {
        setUploadError('Network error during upload')
        setLoading(false)
        return
      }
    }

    const payload = {
      title: title.trim(),
      amountPaise: finalAmountPaise,
      expenseDate: date,
      paidById,
      category: category || (isIncome ? 'Guest Food / Meals' : 'Other'),
      note: note.trim() || undefined,
      imageUrl: finalImageUrl,
      participantIds: Array.from(selectedIds),
      idempotencyKey: initialData ? undefined : idempotencyKey
    }

    try {
      const res = await fetch(initialData ? `/api/expenses/${initialData.id}` : '/api/expenses', {
        method: initialData ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save')
        setLoading(false)
      } else {
        router.push('/expenses')
        router.refresh()
      }
    } catch (err) {
      setError('An error occurred')
      setLoading(false)
    }
  }

  const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/60 transition-colors">
      {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">{error}</div>}
      
      {/* Mode Switcher: Expense vs Money Received */}
      <div className="grid grid-cols-2 p-1 bg-gray-100 dark:bg-gray-700/80 rounded-xl gap-1">
        <button
          type="button"
          onClick={() => handleModeChange('expense')}
          className={`py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            !isIncome
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <span>💸</span>
          <span>Expense</span>
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('income')}
          className={`py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            isIncome
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <span>💵</span>
          <span>Money Received</span>
        </button>
      </div>

      {/* Mode helper description */}
      {isIncome && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-3 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
          <span className="text-base">ℹ️</span>
          <span>
            Record payments received from guests/friends for food or stays. This reduces house food expenses and credits each flatmate's balance.
          </span>
        </div>
      )}

      {/* Amount Display */}
      <div className="text-center py-2">
        <div className={`text-5xl font-light tracking-tight transition-colors ${
          isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-gray-100'
        }`}>
          {isIncome ? '+₹ ' : '₹ '}{amountInput || '0'}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">
          {selectedIds.size > 0 
            ? isIncome ? `+₹${previewShare} credit each` : `₹${previewShare} each` 
            : isIncome ? 'Select flatmates to credit' : 'Select participants'}
        </div>
      </div>

      {/* Receipt / Screenshot Image Upload */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {isIncome ? 'Payment Screenshot (Optional)' : 'Receipt Image (Optional)'}
        </label>
        
        {uploadError && <div className="text-red-500 text-xs">{uploadError}</div>}
        
        {previewUrl ? (
          <div className="relative inline-block border rounded-xl overflow-hidden shadow-sm">
            <img src={previewUrl} alt="Receipt preview" className="w-24 h-24 object-cover" />
            <button 
              type="button" 
              onClick={() => {
                setPreviewUrl(null)
                setImageFile(null)
                setImageUrl(null)
              }}
              className="absolute top-1 right-1 bg-gray-900/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
            >
              ×
            </button>
          </div>
        ) : (
          <div>
            <input 
              type="file" 
              accept="image/*"
              className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 transition-colors"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  if (file.size > 10 * 1024 * 1024) {
                    setUploadError('File exceeds 10MB limit')
                    e.target.value = ''
                    return
                  }
                  setImageFile(file)
                  setUploadError('')
                  const objUrl = URL.createObjectURL(file)
                  setPreviewUrl(objUrl)
                }
              }}
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {isIncome ? 'Description / Guest Name' : 'Title'}
        </label>
        <input 
          type="text" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          placeholder={isIncome ? "e.g. Rahul lunch payment, Weekend guests dinner" : "What was it for?"}
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-3"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {isIncome ? 'Received By' : 'Paid By'}
          </label>
          <select 
            value={paidById} 
            onChange={(e) => setPaidById(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
        <select 
          value={category} 
          onChange={(e) => setCategory(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {isIncome ? 'Share Credit With' : 'Split Between'}
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleToggleAll}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              isAll ? 'bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            All Flatmates
          </button>
          {members.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleToggleMember(m.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                selectedIds.has(m.id) && !isAll 
                  ? (isIncome ? 'bg-emerald-600 text-white dark:bg-emerald-500' : 'bg-blue-600 text-white dark:bg-blue-500')
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Note field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note (Optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Any extra details..."
          rows={2}
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-3 text-sm"
        />
      </div>

      {/* Basic Keypad for mobile-first feeling */}
      <div className="grid grid-cols-3 gap-2 mt-4 select-none">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => handleAmountKey(k.toString())}
            className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 active:bg-gray-200 dark:active:bg-gray-600 py-4 text-xl font-medium rounded-xl transition-colors"
          >
            {k}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handleAmountKey('backspace')}
          className="bg-gray-100 dark:bg-gray-700/50 active:bg-gray-200 dark:active:bg-gray-600 py-4 text-xl font-medium rounded-xl transition-colors flex items-center justify-center text-red-600 dark:text-red-400"
        >
          ⌫
        </button>
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full text-white text-lg font-semibold py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 mt-4 shadow-md ${
          isIncome 
            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30' 
            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
        }`}
      >
        {loading ? 'Saving...' : isIncome ? 'Record Money Received' : 'Save Expense'}
      </button>
    </form>
  )
}
