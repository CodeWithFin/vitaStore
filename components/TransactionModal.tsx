'use client'

import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'

interface TransactionModalProps {
  type: 'IN' | 'OUT' | null
  items: any[]
  onClose: () => void
  onSave: (data: any) => void
}

interface TransactionItem {
  item_id: number
  quantity: number
  notes: string
}

export default function TransactionModal({ type, items, onClose, onSave }: TransactionModalProps) {
  const [transactionItems, setTransactionItems] = useState<TransactionItem[]>([])
  const [currentItem, setCurrentItem] = useState({
    item_id: '',
    quantity: '',
    notes: '',
  })
  const [shop, setShop] = useState('')
  const [globalNotes, setGlobalNotes] = useState('')

  const handleAddItem = () => {
    if (!currentItem.item_id || !currentItem.quantity) {
      alert('Please select an item and enter quantity')
      return
    }
    
    const selectedItem = items.find((item) => item.id === parseInt(currentItem.item_id))
    if (type === 'OUT' && selectedItem && parseInt(currentItem.quantity) > selectedItem.quantity) {
      alert(`Insufficient stock. Available: ${selectedItem.quantity}`)
      return
    }

    setTransactionItems((prev) => [
      ...prev,
      {
        item_id: parseInt(currentItem.item_id),
        quantity: parseInt(currentItem.quantity),
        notes: currentItem.notes,
      },
    ])

    // Reset current item form
    setCurrentItem({
      item_id: '',
      quantity: '',
      notes: '',
    })
  }

  const handleRemoveItem = (index: number) => {
    setTransactionItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (transactionItems.length === 0) {
      alert('Please add at least one item')
      return
    }
    if (type === 'OUT' && !shop) {
      alert('Please select a shop destination')
      return
    }
    
    onSave({
      items: transactionItems,
      shop: type === 'OUT' ? shop : undefined,
      notes: globalNotes,
    })
  }

  const selectedItem = items.find((item) => item.id === parseInt(currentItem.item_id))

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="vellum-glass rounded-sm p-4 md:p-8 max-w-lg w-full border border-neutral-200/50 my-auto max-h-[95vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 md:mb-6 flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-serif text-ink">
            Stock {type === 'IN' ? 'In' : 'Out'}
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-ink transition-colors">
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto pr-1">
          {/* Shop Selection (for Stock Out) */}
          {type === 'OUT' && (
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2">
                Shop Destination *
              </label>
              <select
                value={shop}
                onChange={(e) => setShop(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-sm border border-neutral-200 bg-white/50 focus:outline-none focus:ring-1 focus:ring-ink font-serif"
              >
                <option value="">Select shop...</option>
                <option value="Vitpharm Superior">Vitpharm Superior</option>
                <option value="Vitapharm CBD">Vitapharm CBD</option>
                <option value="Vitapharm Kilimani">Vitapharm Kilimani</option>
              </select>
            </div>
          )}

          {/* Add Items Section */}
          <div className="border border-neutral-200/50 rounded-sm p-4 bg-white/30">
            <h3 className="font-serif text-sm text-ink mb-4">Add Items</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2">
                  Select Item
                </label>
                <select
                  value={currentItem.item_id}
                  onChange={(e) => setCurrentItem({ ...currentItem, item_id: e.target.value })}
                  className="w-full px-4 py-3 rounded-sm border border-neutral-200 bg-white/50 focus:outline-none focus:ring-1 focus:ring-ink font-serif"
                >
                  <option value="">Choose an item...</option>
                  {items
                    .filter((item) => !transactionItems.some((ti) => ti.item_id === item.id))
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.quantity} {item.unit || 'pcs'} available)
                      </option>
                    ))}
                </select>
              </div>

              {selectedItem && type === 'OUT' && (
                <div className="bg-yellow-100/50 border border-yellow-200/50 rounded-sm p-2 text-xs text-yellow-800 font-serif">
                  Available: {selectedItem.quantity} {selectedItem.unit || 'pcs'}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={currentItem.quantity}
                    onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                    min="1"
                    max={type === 'OUT' && selectedItem ? selectedItem.quantity : undefined}
                    className="w-full px-4 py-3 rounded-sm border border-neutral-200 bg-white/50 focus:outline-none focus:ring-1 focus:ring-ink font-mono"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full bg-ink text-paper px-4 py-3 rounded-sm font-mono text-xs tracking-widest uppercase hover:bg-sepia transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2">
                  Item Notes (optional)
                </label>
                <input
                  type="text"
                  value={currentItem.notes}
                  onChange={(e) => setCurrentItem({ ...currentItem, notes: e.target.value })}
                  placeholder="Notes for this item..."
                  className="w-full px-4 py-3 rounded-sm border border-neutral-200 bg-white/50 focus:outline-none focus:ring-1 focus:ring-ink font-serif text-sm"
                />
              </div>
            </div>
          </div>

          {/* Items List */}
          {transactionItems.length > 0 && (
            <div className="border border-neutral-200/50 rounded-sm p-4 bg-white/30 max-h-[200px] overflow-y-auto">
              <h3 className="font-serif text-sm text-ink mb-3">
                Items to Process ({transactionItems.length})
              </h3>
              <div className="space-y-2">
                {transactionItems.map((ti, index) => {
                  const item = items.find((i) => i.id === ti.item_id)
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-white/50 rounded-sm border border-neutral-200/50"
                    >
                      <div className="flex-1">
                        <div className="font-serif text-sm text-ink">{item?.name || 'Unknown'}</div>
                        <div className="font-mono text-[10px] text-neutral-500">
                          {ti.quantity} {item?.unit || 'pcs'}
                          {ti.notes && ` · ${ti.notes}`}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-500 hover:text-red-700 transition-colors ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Global Notes */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2">
              Transaction Notes (optional)
            </label>
            <textarea
              value={globalNotes}
              onChange={(e) => setGlobalNotes(e.target.value)}
              rows={2}
              placeholder="Notes for this transaction..."
              className="w-full px-4 py-3 rounded-sm border border-neutral-200 bg-white/50 focus:outline-none focus:ring-1 focus:ring-ink font-serif"
            ></textarea>
          </div>

          <div className="flex gap-3 mt-6 pb-2 flex-shrink-0 sticky bottom-0 bg-[#FDFCF8]/95 backdrop-blur-sm pt-4 border-t border-neutral-200/30 -mx-4 md:-mx-8 px-4 md:px-8">
            <button
              type="submit"
              disabled={transactionItems.length === 0}
              className="flex-1 bg-ink text-paper px-6 py-3 rounded-sm font-mono text-xs tracking-widest uppercase hover:bg-sepia transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Process {transactionItems.length > 0 ? `(${transactionItems.length} items)` : ''}
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

