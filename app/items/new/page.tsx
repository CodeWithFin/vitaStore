'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ArrowLeft, Save, Package, ArrowRight, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import Link from 'next/link'
import { createItems } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import Notification from '@/components/Notification'

interface NewItem {
  name: string
  sku: string
  category: string
  price: string
  unit: string
  quantity: string
  min_stock: string
}

export default function NewItemsPage() {
  const router = useRouter()
  const [items, setItems] = useState<NewItem[]>([
    { name: '', sku: '', category: '', price: '', unit: 'pcs', quantity: '0', min_stock: '5' }
  ])
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await supabase.from('items').select('category')
        if (data) {
          const uniqueCategories = Array.from(new Set(data.map((i: any) => i.category).filter(Boolean))) as string[]
          setCategories(uniqueCategories.sort())
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
      }
    }
    fetchCategories()
  }, [])

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
  }

  const handleAddItem = () => {
    setItems([...items, { name: '', sku: '', category: '', price: '', unit: 'pcs', quantity: '0', min_stock: '5' }])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const handleChange = (index: number, field: keyof NewItem, value: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate
    const hasEmptyFields = items.some(item => !item.name.trim())
    if (hasEmptyFields) {
      showNotification('Please fill in at least the name for all items', 'error')
      return
    }

    setLoading(true)
    try {
      const formattedItems = items.map(item => ({
        ...item,
        price: item.price ? parseFloat(item.price) : 0,
        quantity: parseInt(item.quantity) || 0,
        min_stock: parseInt(item.min_stock) || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      await createItems(formattedItems)
      showNotification(`${items.length} items added successfully`, 'success')
      
      // Delay redirect to show notification
      setTimeout(() => {
        router.push('/')
      }, 1500)
    } catch (error: any) {
      showNotification(error.message || 'Error creating items', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#1C1917] p-4 md:p-8 font-serif">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <Link 
              href="/"
              className="inline-flex items-center gap-2 text-neutral-500 hover:text-[#1C1917] transition-colors mb-2 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="font-mono text-xs uppercase tracking-widest">Back to Dashboard</span>
            </Link>
            <h1 className="text-3xl md:text-4xl italic text-[#1C1917]">Add New Products</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleAddItem}
              className="flex items-center gap-2 px-6 py-2 border border-neutral-200 hover:border-neutral-800 transition-colors bg-white/50 rounded-full font-mono text-xs uppercase tracking-widest"
            >
              <Plus className="w-4 h-4" />
              Add Row
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-2 bg-[#1C1917] text-[#FDFCF8] hover:bg-[#2C2927] transition-colors rounded-full font-mono text-xs uppercase tracking-widest disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Processing...' : 'Save All Items'}
            </button>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="vellum-glass rounded-sm border border-neutral-200/60 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-neutral-200/60 bg-neutral-50/50">
                  <th className="px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-neutral-500 w-12 text-center">#</th>
                  <th className="px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-neutral-500">Product Name *</th>
                  <th className="px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-neutral-500">SKU</th>
                  <th className="px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-neutral-500">Category</th>
                  <th className="px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-neutral-500 w-24">Price</th>
                  <th className="px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-neutral-500 w-20">Unit</th>
                  <th className="px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-neutral-500 w-24">Stock</th>
                  <th className="px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-neutral-500 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/40">
                {items.map((item, index) => (
                  <tr key={index} className="hover:bg-white/40 transition-colors group">
                    <td className="px-4 py-3 text-center font-mono text-xs text-neutral-400">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleChange(index, 'name', e.target.value)}
                        placeholder="Product name..."
                        required
                        className="w-full bg-transparent border-none focus:ring-0 font-serif text-sm p-0 placeholder:text-neutral-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.sku}
                        onChange={(e) => handleChange(index, 'sku', e.target.value)}
                        placeholder="SKU..."
                        className="w-full bg-transparent border-none focus:ring-0 font-mono text-xs p-0 placeholder:text-neutral-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        list="category-suggestions"
                        value={item.category}
                        onChange={(e) => handleChange(index, 'category', e.target.value)}
                        placeholder="Category..."
                        className="w-full bg-transparent border-none focus:ring-0 font-serif text-xs p-0 text-neutral-600 placeholder:text-neutral-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 border-b border-transparent group-hover:border-neutral-200">
                        <span className="text-neutral-400 text-xs">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => handleChange(index, 'price', e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-transparent border-none focus:ring-0 font-mono text-xs p-0 placeholder:text-neutral-300"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleChange(index, 'unit', e.target.value)}
                        placeholder="pcs"
                        className="w-full bg-transparent border-none focus:ring-0 font-serif text-xs p-0 placeholder:text-neutral-300 text-center"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleChange(index, 'quantity', e.target.value)}
                        placeholder="0"
                        className="w-full bg-transparent border-none focus:ring-0 font-mono text-xs p-0 placeholder:text-neutral-300 text-center"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        disabled={items.length === 1}
                        className="text-neutral-300 hover:text-red-500 transition-colors disabled:opacity-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-neutral-50/50 p-4 border-t border-neutral-200/60 flex justify-center">
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-2 text-neutral-500 hover:text-[#1C1917] transition-colors group px-4 py-2"
            >
              <div className="p-1 rounded-full border border-neutral-300 group-hover:border-[#1C1917] transition-colors">
                <Plus className="w-3 h-3" />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest">Add Another Product</span>
            </button>
          </div>
        </form>

        <div className="mt-8 grid md:grid-cols-2 gap-8">
          <div className="vellum-glass p-6 border border-neutral-200/60 rounded-sm">
            <h3 className="font-serif italic text-lg mb-4 flex items-center gap-2 text-[#1C1917]">
              <Package className="w-5 h-5" />
              Tips for Batch Adding
            </h3>
            <ul className="space-y-3 font-serif text-sm text-neutral-600">
              <li className="flex gap-3">
                <span className="text-neutral-400 font-mono text-xs mt-1">01.</span>
                <span>You can add as many rows as needed before clicking "Save All Items".</span>
              </li>
              <li className="flex gap-3">
                <span className="text-neutral-400 font-mono text-xs mt-1">02.</span>
                <span>SKU and Category are optional but help with tracking and filtering.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-neutral-400 font-mono text-xs mt-1">03.</span>
                <span>The initial stock level you enter will be set as the starting quantity.</span>
              </li>
            </ul>
          </div>
          
          <div className="flex flex-col justify-center items-center p-8 bg-neutral-100/50 border border-dashed border-neutral-300 rounded-sm">
            <p className="font-serif italic text-neutral-500 text-center mb-6">
              "Precision in inventory is the foundation of a successful pharmacy."
            </p>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full max-w-xs bg-[#1C1917] text-[#FDFCF8] py-4 rounded-sm font-mono text-xs uppercase tracking-widest hover:bg-[#2C2927] transition-all shadow-md group border border-neutral-800"
            >
              {loading ? 'Processing...' : 'Confirm & Save All Items'}
            </button>
          </div>
        </div>
      </div>

      <datalist id="category-suggestions">
        {categories.map((cat) => (
          <option key={cat} value={cat} />
        ))}
      </datalist>

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
