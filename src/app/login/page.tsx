'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const MEMBERS = ['Atul', 'Affaan', 'Lalith']

export default function LoginPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  
  const router = useRouter()

  const handleLogin = async (name: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, passphrase }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to login')
        setLoading(false)
      } else {
        router.push('/')
        router.refresh()
      }
    } catch (err) {
      setError('An error occurred')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-full flex flex-col items-center justify-center p-4 py-20">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Flat Expenses</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Who are you?</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Passphrase (if required)
            </label>
            <input
              type="password"
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter passphrase"
            />
          </div>

          <div className="pt-4 space-y-3">
            {MEMBERS.map((member) => (
              <button
                key={member}
                onClick={() => handleLogin(member)}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold py-4 rounded-xl transition-colors active:scale-95 disabled:opacity-50"
              >
                {member}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
