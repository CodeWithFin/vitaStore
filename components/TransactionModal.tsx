'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface TransactionModalProps {
  type: 'IN' | 'OUT' | null
  items: any[]
  onClose: () => void
  onSave: (data: any) => void
}

export default function TransactionModal({ type, items, onClose, onSave }: TransactionModalProps) {
  const [formData, setFormData] = useState({
    item_id: '',
    quantity: '',
    notes: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.item_id || !formData.quantity) {
      alert('Please select an item and enter quantity')
      return
    }
    onSave({
      item_id: parseInt(formData.item_id),
      quantity: parseInt(formData.quantity),
      notes: formData.notes,
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const selectedItem = items.find((item) => item.id === parseInt(formData.item_id))

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="vellum-glass rounded-sm p-8 max-w-lg w-full border border-neutral-200/50">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-serif text-ink">
            Stock {type === 'IN' ? 'In' : 'Out'}
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-ink transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2">
              Select Item *
            </label>
            <select
              name="item_id"
              value={formData.item_id}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-sm border border-neutral-200 bg-white/50 focus:outline-none focus:ring-1 focus:ring-ink font-serif"
            >
              <option value="">Choose an item...</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.quantity} {item.unit || 'pcs'} available)
                </option>
              ))}
            </select>
          </div>
          {selectedItem && type === 'OUT' && (
            <div className="bg-yellow-100/50 border border-yellow-200/50 rounded-sm p-3 text-sm text-yellow-800 font-serif">
              Available: {selectedItem.quantity} {selectedItem.unit || 'pcs'}
            </div>
          )}
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
              min="1"
              max={type === 'OUT' && selectedItem ? selectedItem.quantity : undefined}
              className="w-full px-4 py-3 rounded-sm border border-neutral-200 bg-white/50 focus:outline-none focus:ring-1 focus:ring-ink font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 rounded-sm border border-neutral-200 bg-white/50 focus:outline-none focus:ring-1 focus:ring-ink font-serif"
            ></textarea>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              className="flex-1 bg-ink text-paper px-6 py-3 rounded-sm font-mono text-xs tracking-widest uppercase hover:bg-sepia transition-colors"
            >
              Process
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

