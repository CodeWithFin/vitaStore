import { supabase } from './supabase'

// Items
export const getItems = async (params?: { search?: string; category?: string }) => {
  let query = supabase.from('items').select('*')

  if (params?.search) {
    query = query.or(`name.ilike.%${params.search}%,sku.ilike.%${params.search}%`)
  }

  if (params?.category) {
    query = query.eq('category', params.category)
  }

  const { data, error } = await query.order('name')
  
  if (error) throw error
  return data || []
}

export const getItem = async (id: number) => {
  const { data, error } = await supabase.from('items').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export const createItem = async (item: any) => {
  const { data, error } = await supabase.from('items').insert(item).select().single()
  if (error) throw error
  return data
}

export const updateItem = async (id: number, item: any) => {
  const { data, error } = await supabase
    .from('items')
    .update({ ...item, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteItem = async (id: number) => {
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) throw error
}

// Transactions
export const getTransactions = async (params?: { itemId?: number; type?: string; limit?: number }) => {
  let query = supabase
    .from('transactions')
    .select(`
      *,
      items (
        name,
        unit,
        sku
      )
    `)
    .order('created_at', { ascending: false })

  if (params?.itemId) {
    query = query.eq('item_id', params.itemId)
  }

  if (params?.type) {
    query = query.eq('type', params.type)
  }

  if (params?.limit) {
    query = query.limit(params.limit)
  }

  const { data, error } = await query
  
  if (error) throw error
  return data || []
}

export const stockIn = async (data: { item_id: number; quantity: number; notes?: string }) => {
  const { error: transError } = await supabase.from('transactions').insert({
    item_id: data.item_id,
    type: 'IN',
    quantity: data.quantity,
    notes: data.notes || '',
  })

  if (transError) throw transError

  // Update item quantity
  const { data: item } = await supabase.from('items').select('quantity').eq('id', data.item_id).single()
  if (!item) throw new Error('Item not found')

  const { error: updateError } = await supabase
    .from('items')
    .update({ 
      quantity: item.quantity + data.quantity,
      updated_at: new Date().toISOString()
    })
    .eq('id', data.item_id)

  if (updateError) throw updateError
}

export const stockOut = async (data: { item_id: number; quantity: number; notes?: string }) => {
  // Check stock availability
  const { data: item } = await supabase.from('items').select('quantity').eq('id', data.item_id).single()
  if (!item) throw new Error('Item not found')
  if (item.quantity < data.quantity) {
    throw new Error(`Insufficient stock. Available: ${item.quantity}`)
  }

  const { error: transError } = await supabase.from('transactions').insert({
    item_id: data.item_id,
    type: 'OUT',
    quantity: data.quantity,
    notes: data.notes || '',
  })

  if (transError) throw transError

  // Update item quantity
  const { error: updateError } = await supabase
    .from('items')
    .update({ 
      quantity: item.quantity - data.quantity,
      updated_at: new Date().toISOString()
    })
    .eq('id', data.item_id)

  if (updateError) throw updateError
}

// Dashboard
export const getDashboardSummary = async () => {
  const [itemsResult, transactionsResult] = await Promise.all([
    supabase.from('items').select('*'),
    supabase.from('transactions').select(`
      *,
      items (
        name,
        unit,
        sku
      )
    `).order('created_at', { ascending: false }).limit(10),
  ])

  if (itemsResult.error) throw itemsResult.error
  if (transactionsResult.error) throw transactionsResult.error

  const items = itemsResult.data || []
  const transactions = transactionsResult.data || []

  const totalItems = items.length
  const lowStock = items.filter((item: any) => item.quantity <= item.min_stock).length
  const categories = [...new Set(items.map((item: any) => item.category).filter(Boolean))].length
  const totalValue = items.reduce((sum: number, item: any) => sum + (item.quantity * (item.price || 0)), 0)
  const lowStockItems = items
    .filter((item: any) => item.quantity <= item.min_stock)
    .sort((a: any, b: any) => {
      const ratioA = a.quantity / (a.min_stock || 1)
      const ratioB = b.quantity / (b.min_stock || 1)
      return ratioA - ratioB
    })
    .slice(0, 5)
  const topItems = [...items].sort((a: any, b: any) => b.quantity - a.quantity).slice(0, 7)
  
  const healthyItems = items.filter((item: any) => item.quantity > item.min_stock).length
  const healthPercent = items.length > 0 ? Math.round((healthyItems / items.length) * 100) : 100

  return {
    totalItems,
    lowStock,
    categories,
    totalValue,
    lowStockItems,
    topItems,
    recentTransactions: transactions,
    healthPercent,
  }
}

