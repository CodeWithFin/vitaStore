'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Package,
  ArrowLeft,
  Search,
  Calendar,
  Clock,
  TrendingDown,
} from 'lucide-react'
import { getItems } from '@/lib/api'

export default function ExpiringPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const itemsRes = await getItems()
      setItems(itemsRes)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiry = new Date(expiryDate)
    expiry.setHours(0, 0, 0, 0)
    const diffTime = expiry.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const oneYearFromNow = new Date()
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)

  const expiringItems = items
    .filter((item) => {
      if (!item.expiry_date) return false
      const expiryDate = new Date(item.expiry_date)
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = 
        item.name?.toLowerCase().includes(searchLower) || 
        item.sku?.toLowerCase().includes(searchLower)
      
      return matchesSearch && expiryDate <= oneYearFromNow && expiryDate >= new Date()
    })
    .sort((a, b) => {
      const dateA = new Date(a.expiry_date).getTime()
      const dateB = new Date(b.expiry_date).getTime()
      return dateA - dateB
    })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCF8]">
        <div className="text-[#1C1917] font-serif">Loading...</div>
      </div>
    )
  }

  return (
    <div className="antialiased font-sans bg-[#FDFCF8] min-h-screen w-full relative p-4 md:p-12">
      {/* Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundSize: '40px 40px',
          backgroundImage: `
            linear-gradient(to right, rgba(28, 25, 23, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(28, 25, 23, 0.03) 1px, transparent 1px)
          `,
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)',
        }}
      ></div>

      <main className="relative z-20 max-w-5xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Link 
              href="/" 
              className="flex items-center gap-2 text-neutral-500 hover:text-[#1C1917] transition-colors group mb-2"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="font-mono text-xs uppercase tracking-widest">Back to Dashboard</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100/50 rounded-sm border border-orange-200/50">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <h1 className="font-serif text-3xl text-[#1C1917]">Expiring Products</h1>
            </div>
          </div>
        </header>

        {/* Search and Stats */}
        <div className="vellum-glass rounded-sm p-4 border border-neutral-200/60 flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search expiring items..."
              className="w-full pl-10 pr-4 py-3 text-sm border border-neutral-200 rounded-sm bg-white/50 font-mono focus:outline-none focus:border-neutral-800 transition-colors"
            />
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 bg-white/50 px-3 py-1 rounded-sm border border-neutral-100 italic">
            Monitoring products expiring within 365 days
          </div>
        </div>

        {/* Expiry List */}
        <div className="vellum-glass rounded-sm border border-neutral-200/60 overflow-hidden shadow-xl">
          <div className="border-b border-neutral-200/60 px-6 py-4 bg-gradient-to-r from-orange-50/50 to-amber-50/30 flex justify-between items-center">
            <span className="font-serif italic text-lg text-[#1C1917]">Products Near Expiry</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#78350F] font-bold">
              {expiringItems.length} Products Found
            </span>
          </div>
          
          <div className="divide-y divide-neutral-200/40">
            {expiringItems.length === 0 ? (
              <div className="px-6 py-12 text-center text-neutral-400 font-serif italic">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No products expiring within a year found</p>
              </div>
            ) : (
              expiringItems.map((item) => {
                const daysUntilExpiry = getDaysUntilExpiry(item.expiry_date)
                const isExpiringSoon = daysUntilExpiry <= 30
                const isExpiringVerySoon = daysUntilExpiry <= 7

                return (
                  <div key={item.id} className="px-6 py-5 hover:bg-white/40 transition-colors group">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex gap-4 flex-1 min-w-0">
                        <div className="flex-shrink-0 mt-1">
                          <div className={`w-10 h-10 rounded-sm border flex items-center justify-center ${
                            isExpiringVerySoon 
                              ? 'bg-red-100/50 border-red-200/50' 
                              : isExpiringSoon 
                              ? 'bg-orange-100/50 border-orange-200/50' 
                              : 'bg-amber-100/50 border-amber-200/50'
                          }`}>
                            <Clock className={`w-5 h-5 ${
                              isExpiringVerySoon 
                                ? 'text-red-600' 
                                : isExpiringSoon 
                                ? 'text-orange-600' 
                                : 'text-amber-600'
                            }`} />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <Package className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                            <span className="font-serif text-base font-medium text-[#1C1917] truncate">{item.name}</span>
                            <span className="font-mono text-[9px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-sm uppercase tracking-wider hidden sm:inline-block">
                              SKU: {item.sku || 'N/A'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-4">
                            <span className="font-mono text-xs text-neutral-500">
                              Stock: <span className="text-[#1C1917] font-bold">{item.quantity} {item.unit || 'pcs'}</span>
                            </span>
                            <span className="font-serif text-xs px-2 py-0.5 bg-white/50 border border-neutral-100 rounded-sm text-neutral-400 italic">
                              {item.category || 'No Category'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 flex-shrink-0 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-neutral-400" />
                          <span className="font-mono text-[11px] text-neutral-600 font-bold">
                            {new Date(item.expiry_date).toLocaleDateString('en-KE', { 
                              day: 'numeric', 
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-sm border ${
                          isExpiringVerySoon 
                            ? 'bg-red-50 border-red-100 text-red-700' 
                            : isExpiringSoon 
                            ? 'bg-orange-50 border-orange-100 text-orange-700' 
                            : 'bg-amber-50 border-amber-100 text-amber-700'
                        }`}>
                          <TrendingDown className="w-3 h-3" />
                          <span className="font-mono text-[10px] font-bold uppercase tracking-tighter">
                            {daysUntilExpiry <= 0 ? 'EXPIRED' : `${daysUntilExpiry} Days Remaining`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
