'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Package,
  ArrowDownCircle,
  ArrowLeft,
  Search,
  Calendar,
  FileText,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import {
  getTransactions,
  getItems,
  stockInMultiple,
  deleteTransaction,
} from '@/lib/api'
import TransactionModal from '@/components/TransactionModal'
import Notification from '@/components/Notification'

interface NotificationState {
  message: string
  type: 'success' | 'error' | 'info'
}

export default function StockInPage() {
  const [items, setItems] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [notification, setNotification] = useState<NotificationState | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [itemsRes, transRes] = await Promise.all([
        getItems(),
        getTransactions({ type: 'IN' }),
      ])
      setItems(itemsRes)
      setTransactions(transRes)
    } catch (error) {
      console.error('Error loading data:', error)
      showNotification('Error loading data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type })
  }

  const handleStockIn = async (data: any) => {
    try {
      await stockInMultiple(data.items || [data], data.notes, data.transaction_date)
      const itemCount = data.items ? data.items.length : 1
      showNotification(
        `Stock in: ${itemCount} item${itemCount > 1 ? 's' : ''} processed successfully`,
        'success'
      )
      await loadData()
      setShowTransactionModal(false)
    } catch (error: any) {
      showNotification(error.message || 'Error processing transaction', 'error')
    }
  }

  const handleDeleteTransaction = async (transactionId: number, itemName: string, quantity: number) => {
    if (!window.confirm(`Are you sure you want to undo this stock in? This will remove ${quantity} ${itemName} from inventory.`)) return
    try {
      await deleteTransaction(transactionId)
      showNotification(`Stock in undone. ${quantity} ${itemName} removed from inventory.`, 'success')
      await loadData()
    } catch (error: any) {
      showNotification(error.message || 'Error undoing transaction', 'error')
    }
  }

  const filteredTransactions = transactions.filter((tx) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      (tx.items?.name?.toLowerCase().includes(searchLower) || false) ||
      (tx.items?.sku?.toLowerCase().includes(searchLower) || false) ||
      (tx.notes?.toLowerCase().includes(searchLower) || false)
    )
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
              <div className="p-2 bg-green-100/50 rounded-sm border border-green-200/50">
                <ArrowDownCircle className="w-6 h-6 text-green-600" />
              </div>
              <h1 className="font-serif text-3xl text-[#1C1917]">Stock In Management</h1>
            </div>
          </div>

          <button
            onClick={() => setShowTransactionModal(true)}
            className="flex items-center justify-center gap-3 bg-[#1C1917] text-[#FDFCF8] px-8 py-3 rounded-sm hover:bg-[#78350F] transition-all duration-500 shadow-lg"
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span className="font-mono text-xs tracking-widest uppercase">New Stock In</span>
          </button>
        </header>

        {/* Search and Filters */}
        <div className="vellum-glass rounded-sm p-4 border border-neutral-200/60 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by item name, SKU, or notes..."
              className="w-full pl-10 pr-4 py-3 text-sm border border-neutral-200 rounded-sm bg-white/50 font-mono focus:outline-none focus:border-neutral-800 transition-colors"
            />
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
            {filteredTransactions.length} Transactions
          </div>
        </div>

        {/* Transaction History */}
        <div className="vellum-glass rounded-sm border border-neutral-200/60 overflow-hidden shadow-xl">
          <div className="border-b border-neutral-200/60 px-6 py-4 bg-gradient-to-r from-green-50/50 to-emerald-50/30">
            <span className="font-serif italic text-lg text-[#1C1917]">Inbound History</span>
          </div>
          
          <div className="divide-y divide-neutral-200/40">
            {filteredTransactions.length === 0 ? (
              <div className="px-6 py-12 text-center text-neutral-400 font-serif italic">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No stock in transactions found matching your search</p>
              </div>
            ) : (
              filteredTransactions.map((tx) => (
                <div key={tx.id} className="px-6 py-5 hover:bg-white/40 transition-colors group">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-10 h-10 rounded-sm bg-green-100/50 border border-green-200/50 flex items-center justify-center">
                          <ArrowDownCircle className="w-5 h-5 text-green-600" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="flex items-center gap-3">
                          <Package className="w-4 h-4 text-neutral-400" />
                          <span className="font-serif text-base font-medium text-[#1C1917]">{tx.items?.name || 'Unknown item'}</span>
                          <span className="font-mono text-[10px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-sm uppercase tracking-wider">
                            SKU: {tx.items?.sku || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-xs font-bold text-green-700 bg-green-100/50 px-3 py-1 rounded-sm border border-green-200/30">
                            +{tx.quantity} {tx.items?.unit || 'pcs'}
                          </span>
                          {tx.notes && (
                            <div className="flex items-center gap-2 text-neutral-500 italic">
                              <FileText className="w-3.5 h-3.5" />
                              <span className="font-serif text-sm">{tx.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 justify-between md:justify-end md:w-auto w-full border-t md:border-t-0 pt-3 md:pt-0 border-neutral-100">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-neutral-400" />
                        <span className="font-mono text-xs text-neutral-600">
                          {new Date(tx.transaction_date || tx.created_at).toLocaleDateString('en-KE', { 
                            day: 'numeric', 
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteTransaction(tx.id, tx.items?.name || 'item', tx.quantity)}
                        className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-sm transition-all"
                        title="Undo this stock in"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {showTransactionModal && (
        <TransactionModal
          type="IN"
          items={items}
          onClose={() => setShowTransactionModal(false)}
          onSave={handleStockIn}
        />
      )}

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  )
}
