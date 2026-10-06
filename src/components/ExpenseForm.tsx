'use client'

import { useState, useEffect } from 'react'
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

const CATEGORIES = ['Rent', 'Utilities', 'Groceries', 'Food and Dining', 'Household', 'Internet', 'Furniture', 'Other']

export default function ExpenseForm({ initialData, members, currentMemberId }: { initialData?: ExpenseData, members: Member[], currentMemberId: string }) {
  const router = useRouter()
  const [title, setTitle] = useState(initialData?.title || '')
  const [amountInput, setAmountInput] = useState(initialData ? formatPaiseToAmount(initialData.amountPaise) : '')
  const [date, setDate] = useState(initialData?.expenseDate || new Date().toISOString().split('T')[0])
  const [paidById, setPaidById] = useState(initialData?.paidById || currentMemberId)
  const [category, setCategory] = useState(initialData?.category || '')
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

  const amountPaise = parseAmountToPaise(amountInput)
  const participantCount = selectedIds.size || 1 // Avoid divide by zero in preview
  const previewShare = amountPaise > 0 && selectedIds.size > 0 
    ? formatPaiseToAmount(Math.floor(amountPaise / selectedIds.size)) // approx
    : '0.00'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedIds.size === 0) {
      setError('Select at least one person to split with')
      return
    }
    if (amountPaise <= 0) {
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
      title,
      amountPaise,
      expenseDate: date,
      paidById,
      category,
      note,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm">
      {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">{error}</div>}
      
      {/* Amount Display */}
      <div className="text-center">
        <div className="text-5xl font-light text-gray-900 dark:text-gray-100 tracking-tight">
          ₹ {amountInput || '0'}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">
          {selectedIds.size > 0 ? `₹${previewShare} each` : 'Select participants'}
        </div>
      </div>

      {/* Receipt Image Upload */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Receipt Image (Optional)</label>
        
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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
        <input 
          type="text" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          placeholder="What was it for?"
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-3"
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paid By</label>
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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Split Between</label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleToggleAll}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              isAll ? 'bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            All
          </button>
          {members.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleToggleMember(m.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                selectedIds.has(m.id) && !isAll ? 'bg-blue-600 text-white dark:bg-blue-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
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
        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold py-4 rounded-xl transition-colors active:scale-95 disabled:opacity-50 mt-4"
      >
        {loading ? 'Saving...' : 'Save Expense'}
      </button>
    </form>
  )
}
