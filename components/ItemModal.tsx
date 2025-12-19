'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface ItemModalProps {
  item?: any
  onClose: () => void
  onSave: (itemData: any) => void
}

export default function ItemModal({ item, onClose, onSave }: ItemModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    quantity: 0,
    min_stock: 0,
    unit: 'pcs',
    price: 0,
    expiry_date: '',
  })

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        sku: item.sku || '',
        category: item.category || '',
        quantity: item.quantity || 0,
        min_stock: item.min_stock || 0,
        unit: item.unit || 'pcs',
        price: item.price || 0,
        expiry_date: item.expiry_date || '',
      })
    }
  }, [item])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Convert empty expiry_date to null for optional field
    const submitData = {
      ...formData,
      expiry_date: formData.expiry_date || null,
    }
    onSave(submitData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'quantity' || name === 'min_stock' || name === 'price' 
        ? parseFloat(value) || 0 
        : value,
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="vellum-glass rounded-sm p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-neutral-200/50">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-serif text-ink">
            {item ? 'Edit Item' : 'Add New Item'}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-ink transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2">
              Item Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-sm border border-neutral-200 bg-white/50 focus:outline-none focus:ring-1 focus:ring-ink font-serif"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2">
                SKU (optional)
              </label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-sm border border-neutral-200 bg-white/50 focus:outline-none focus:ring-1 focus:ring-ink font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2">
                Category *
              </label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-sm border border-neutral-200 bg-white/50 focus:outline-none focus:ring-1 focus:ring-ink font-serif"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-4 py-3 rounded-sm border border-neutral-200 bg-white/50 focus:outline-none focus:ring-1 focus:ring-ink font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2">
                Min Stock *
              </label>
              <input
                type="number"
                name="min_stock"
                value={formData.min_stock}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-4 py-3 rounded-sm border border-neutral-200 bg-white/50 focus:outline-none focus:ring-1 focus:ring-ink font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2">
                Unit
              </label>
              <input
                type="text"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                placeholder="pcs"
                className="w-full px-4 py-3 rounded-sm border border-neutral-200 bg-white/50 focus:outline-none focus:ring-1 focus:ring-ink font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2">
                Price (optional)
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-4 py-3 rounded-sm border border-neutral-200 bg-white/50 focus:outline-none focus:ring-1 focus:ring-ink font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2">
                Expiry Date (optional)
              </label>
              <input
                type="date"
                name="expiry_date"
                value={formData.expiry_date}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-sm border border-neutral-200 bg-white/50 focus:outline-none focus:ring-1 focus:ring-ink font-mono"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              className="flex-1 bg-ink text-paper px-6 py-3 rounded-sm font-mono text-xs tracking-widest uppercase hover:bg-sepia transition-colors"
            >
              Save Item
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-sm font-mono text-xs tracking-widest uppercase border border-neutral-200 hover:bg-white/50 transition-colors text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

