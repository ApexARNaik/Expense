'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function DeleteExpenseButton({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this expense?')) return
    
    setLoading(true)
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/expenses')
      router.refresh()
    } else {
      alert('Failed to delete expense')
      setLoading(false)
    }
  }

  return (
    <button 
      onClick={handleDelete}
      disabled={loading}
      className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-medium transition-colors"
    >
      {loading ? 'Deleting...' : 'Delete'}
    </button>
  )
}
