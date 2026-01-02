'use client'

import { useState, useRef, useEffect } from 'react'
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
  const [itemSearchTerm, setItemSearchTerm] = useState('')
  const [transactionDate, setTransactionDate] = useState('')
  const [showItemDropdown, setShowItemDropdown] = useState(false)
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([])
  const [itemQuantities, setItemQuantities] = useState<Record<number, string>>({})
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowItemDropdown(false)
      }
    }

    if (showItemDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showItemDropdown])

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
    setItemSearchTerm('')
    setShowItemDropdown(false)
  }

  const handleRemoveItem = (index: number) => {
    setTransactionItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSelectItem = (itemId: number, isCheckboxClick: boolean = false) => {
    if (isCheckboxClick) {
      // Toggle multi-select
      if (selectedItemIds.includes(itemId)) {
        // Remove from selection
        setSelectedItemIds(selectedItemIds.filter(id => id !== itemId))
        const newQuantities = { ...itemQuantities }
        delete newQuantities[itemId]
        setItemQuantities(newQuantities)
      } else {
        // Add to selection
        setSelectedItemIds([...selectedItemIds, itemId])
        setItemQuantities({ ...itemQuantities, [itemId]: '' })
      }
      // Keep dropdown open for multi-select
    } else {
      // Single-item selection (click on item name)
      setCurrentItem({ ...currentItem, item_id: itemId.toString() })
      setItemSearchTerm('')
      setShowItemDropdown(false)
    }
  }

  const handleAddSelectedItems = () => {
    const itemsToAdd: TransactionItem[] = []
    
    for (const itemId of selectedItemIds) {
      const quantity = itemQuantities[itemId]
      if (!quantity || parseInt(quantity) <= 0) {
        alert(`Please enter a quantity for ${items.find(i => i.id === itemId)?.name || 'selected item'}`)
        return
      }
      
      const item = items.find(i => i.id === itemId)
      if (type === 'OUT' && item && parseInt(quantity) > item.quantity) {
        alert(`Insufficient stock for ${item.name}. Available: ${item.quantity}`)
        return
      }

      itemsToAdd.push({
        item_id: itemId,
        quantity: parseInt(quantity),
        notes: '',
      })
    }

    if (itemsToAdd.length === 0) {
      alert('Please select at least one item and enter quantities')
      return
    }

    setTransactionItems((prev) => [...prev, ...itemsToAdd])
    
    // Reset selections
    setSelectedItemIds([])
    setItemQuantities({})
    setItemSearchTerm('')
    setShowItemDropdown(false)
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
      transaction_date: transactionDate || undefined,
    })
  }

  const availableItems = items.filter((item) => !transactionItems.some((ti) => ti.item_id === item.id))
  const filteredItemOptions = availableItems.filter((item) => {
    if (!itemSearchTerm.trim()) return true
    const term = itemSearchTerm.toLowerCase()
    return (
      item.name.toLowerCase().includes(term) ||
      (item.sku && item.sku.toLowerCase().includes(term))
    )
  })

  const selectedItem = items.find((item) => item.id === parseInt(currentItem.item_id))

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto overflow-x-hidden">
      <div className="vellum-glass rounded-sm p-4 md:p-8 max-w-lg w-full border border-neutral-200/50 my-auto max-h-[95vh] flex flex-col overflow-x-hidden">
        <div className="flex justify-between items-center mb-4 md:mb-6 flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-serif text-ink">
            Stock {type === 'IN' ? 'In' : 'Out'}
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-ink transition-colors">
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto overflow-x-hidden pr-1">
          {/* Transaction Date */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2">
              Transaction Date (optional)
            </label>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="w-full px-4 py-3 rounded-sm border border-neutral-200 bg-white/50 focus:outline-none focus:ring-1 focus:ring-ink font-mono"
            />
          </div>

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
              <div className="relative" ref={dropdownRef}>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2">
                  Select Item
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={itemSearchTerm}
                    onChange={(e) => {
                      setItemSearchTerm(e.target.value)
                      setShowItemDropdown(true)
                      setCurrentItem({ ...currentItem, item_id: '' })
                    }}
                    onFocus={() => setShowItemDropdown(true)}
                    placeholder="Search by name or SKU..."
                    className="w-full px-4 py-3 rounded-sm border border-neutral-200 bg-white/50 focus:outline-none focus:ring-1 focus:ring-ink font-serif text-sm"
                  />
                  {showItemDropdown && filteredItemOptions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-sm shadow-lg max-h-60 overflow-y-auto">
                      {filteredItemOptions.map((item) => {
                        const isSelected = selectedItemIds.includes(item.id)
                        return (
                          <div
                            key={item.id}
                            className={`w-full border-b border-neutral-100 last:border-b-0 flex items-center gap-3 ${
                              isSelected ? 'bg-blue-50' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectItem(item.id, true)}
                              className="w-4 h-4 text-ink border-neutral-300 rounded focus:ring-ink ml-4"
                            />
                            <button
                              type="button"
                              onClick={() => handleSelectItem(item.id, false)}
                              className="flex-1 text-left px-2 py-3 hover:bg-neutral-50 transition-colors"
                            >
                              <div className="font-serif text-sm text-ink">{item.name}</div>
                              <div className="font-mono text-[10px] text-neutral-500 mt-1">
                                SKU: {item.sku || 'N/A'} · {item.quantity} {item.unit || 'pcs'} available
                              </div>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {showItemDropdown && itemSearchTerm && filteredItemOptions.length === 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-sm shadow-lg">
                      <div className="px-4 py-3 text-sm text-neutral-500 font-serif">
                        No matching items found
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Single Item Selection Display */}
              {currentItem.item_id && selectedItem && selectedItemIds.length === 0 && (
                <div className="mt-2 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-sm">
                  <div className="font-serif text-sm text-ink">{selectedItem.name}</div>
                  <div className="font-mono text-[10px] text-neutral-500">
                    Selected: {selectedItem.quantity} {selectedItem.unit || 'pcs'} available
                  </div>
                </div>
              )}

              {selectedItem && type === 'OUT' && selectedItemIds.length === 0 && (
                <div className="bg-yellow-100/50 border border-yellow-200/50 rounded-sm p-2 text-xs text-yellow-800 font-serif">
                  Available: {selectedItem.quantity} {selectedItem.unit || 'pcs'}
                </div>
              )}

              {/* Selected Items with Quantities */}
              {selectedItemIds.length > 0 && (
                <div className="border border-neutral-200/50 rounded-sm p-4 bg-white/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif text-sm text-ink">
                      Selected Items ({selectedItemIds.length})
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedItemIds([])
                        setItemQuantities({})
                      }}
                      className="text-xs text-neutral-500 hover:text-ink font-mono uppercase tracking-widest"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedItemIds.map((itemId) => {
                      const item = items.find(i => i.id === itemId)
                      if (!item) return null
                      return (
                        <div
                          key={itemId}
                          className="flex items-center gap-3 p-2 bg-white/50 rounded-sm border border-neutral-200/50"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-serif text-sm text-ink truncate">{item.name}</div>
                            <div className="font-mono text-[10px] text-neutral-500">
                              {item.quantity} {item.unit || 'pcs'} available
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={itemQuantities[itemId] || ''}
                              onChange={(e) =>
                                setItemQuantities({
                                  ...itemQuantities,
                                  [itemId]: e.target.value,
                                })
                              }
                              min="1"
                              max={type === 'OUT' ? item.quantity : undefined}
                              placeholder="Qty"
                              className="w-20 px-2 py-2 rounded-sm border border-neutral-200 bg-white focus:outline-none focus:ring-1 focus:ring-ink font-mono text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => handleSelectItem(itemId)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSelectedItems}
                    className="w-full bg-ink text-paper px-4 py-3 rounded-sm font-mono text-xs tracking-widest uppercase hover:bg-sepia transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add {selectedItemIds.length} Item{selectedItemIds.length > 1 ? 's' : ''}
                  </button>
                </div>
              )}

              {/* Single Item Add (for backward compatibility) */}
              {selectedItemIds.length === 0 && currentItem.item_id && (
                <div className="grid grid-cols-2 gap-3 min-w-0">
                  <div className="min-w-0">
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
                  <div className="flex items-end min-w-0">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full bg-ink text-paper px-4 py-3 rounded-sm font-mono text-xs tracking-widest uppercase hover:bg-sepia transition-colors flex items-center justify-center gap-2 min-w-0"
                    >
                      <Plus className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Add</span>
                    </button>
                  </div>
                </div>
              )}

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
                      className="flex items-center justify-between p-2 bg-white/50 rounded-sm border border-neutral-200/50 min-w-0"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="font-serif text-sm text-ink truncate">{item?.name || 'Unknown'}</div>
                        <div className="font-mono text-[10px] text-neutral-500 truncate">
                          {ti.quantity} {item?.unit || 'pcs'}
                          {ti.notes && ` · ${ti.notes}`}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-500 hover:text-red-700 transition-colors ml-2 flex-shrink-0"
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

          <div className="flex gap-3 mt-6 pb-2 flex-shrink-0 sticky bottom-0 bg-[#FDFCF8]/95 backdrop-blur-sm pt-4 border-t border-neutral-200/30 -mx-4 md:-mx-8 px-4 md:px-8 max-w-full overflow-x-hidden min-w-0">
            <button
              type="submit"
              disabled={transactionItems.length === 0}
              className="flex-1 bg-ink text-paper px-4 md:px-6 py-3 rounded-sm font-mono text-xs tracking-widest uppercase hover:bg-sepia transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-0 truncate"
            >
              Process {transactionItems.length > 0 ? `(${transactionItems.length})` : ''}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 md:px-6 py-3 rounded-sm font-mono text-xs tracking-widest uppercase border border-neutral-200 hover:bg-white/50 transition-colors text-ink flex-shrink-0"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

