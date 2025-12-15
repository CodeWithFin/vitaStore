'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LogIn } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.session) {
        router.push('/')
      }
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#E8E2D2] p-4 overflow-y-auto" style={{ minHeight: '100vh' }}>
      <div className="bg-[#F9F8F4] rounded-[2.5rem] shadow-2xl p-6 md:p-8 max-w-md w-full border border-white/40">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-medium tracking-tight text-stone-900 mb-2">
            VitaStore
          </h1>
          <p className="text-stone-500">Inventory Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-300 bg-white"
              placeholder="Enter email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-300 bg-white"
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full bg-gradient-to-r from-[#1C1917] to-[#78350F] text-white px-8 py-4 rounded-sm font-serif text-lg tracking-wide hover:from-[#78350F] hover:to-[#9A3412] transition-all duration-500 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed mt-6 shadow-lg hover:shadow-xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <LogIn className="w-5 h-5 relative z-10 transition-transform group-hover:translate-x-1" />
            <span className="relative z-10 font-mono text-xs uppercase tracking-widest">
              {loading ? 'Authenticating...' : 'Enter System'}
            </span>
          </button>
        </form>
      </div>
    </div>
  )
}

