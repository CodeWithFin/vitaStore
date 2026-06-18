import { supabase } from './supabase'

export interface ItemBatch {
  id: number
  quantity: number
  expiry_date: string | null
  created_at: string
}

export interface ItemWithStock {
  id: number
  name: string
  sku: string | null
  unit: string
  min_stock: number
  price: number
  category: string | null
  created_at: string
  updated_at: string
  quantity: number
  expiry_date: string | null
  batches: ItemBatch[]
}

const ITEMS_WITH_STOCK = 'items_with_stock'

const normalizeBatches = (batches: unknown): ItemBatch[] => {
  if (!batches) return []
  if (Array.isArray(batches)) return batches as ItemBatch[]
  if (typeof batches === 'string') {
    try {
      return JSON.parse(batches) as ItemBatch[]
    } catch {
      return []
    }
  }
  return []
}

const normalizeItem = (item: any): ItemWithStock => ({
  ...item,
  quantity: item.quantity ?? 0,
  batches: normalizeBatches(item.batches),
})

const optionalSku = (sku: string | null | undefined) => sku ?? undefined

const findExistingItem = async (sku?: string | null, name?: string) => {
  if (sku?.trim()) {
    const { data } = await supabase
      .from('items')
      .select('id')
      .eq('sku', sku.trim())
      .maybeSingle()
    if (data) return data
  }

  if (name?.trim()) {
    const { data } = await supabase
      .from('items')
      .select('id')
      .eq('name', name.trim())
      .maybeSingle()
    if (data) return data
  }

  return null
}

const addStockBatch = async (
  itemId: number,
  quantity: number,
  expiryDate?: string | null
) => {
  if (quantity <= 0) {
    if (expiryDate) {
      throw new Error('Quantity must be greater than 0 when setting an expiry date')
    }
    return
  }

  const { error } = await supabase.rpc('add_stock_batch', {
    p_item_id: itemId,
    p_quantity: quantity,
    p_expiry_date: expiryDate || null,
  })

  if (error) throw error
}

const deductStockFefo = async (itemId: number, quantity: number) => {
  const { error } = await supabase.rpc('deduct_stock_fefo', {
    p_item_id: itemId,
    p_quantity: quantity,
  })

  if (error) throw error
}

const getTotalStock = async (itemId: number) => {
  const item = await getItem(itemId)
  return item.quantity
}

// Items
export const getItems = async (params?: { search?: string; category?: string }) => {
  let query = supabase.from(ITEMS_WITH_STOCK).select('*')

  if (params?.search) {
    query = query.or(`name.ilike.%${params.search}%,sku.ilike.%${params.search}%`)
  }

  if (params?.category) {
    query = query.eq('category', params.category)
  }

  const { data, error } = await query.order('name')

  if (error) throw error
  return (data || []).map(normalizeItem)
}

export const getItem = async (id: number) => {
  const { data, error } = await supabase
    .from(ITEMS_WITH_STOCK)
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return normalizeItem(data)
}

export const createItem = async (item: any) => {
  const quantity = Number(item.quantity) || 0
  const expiryDate = item.expiry_date || null
  const { quantity: _q, expiry_date: _e, batches: _b, ...itemFields } = item

  const existing = await findExistingItem(itemFields.sku, itemFields.name)

  if (existing) {
    await addStockBatch(existing.id, quantity, expiryDate)
    return getItem(existing.id)
  }

  const { data, error } = await supabase
    .from('items')
    .insert({
      ...itemFields,
      created_at: itemFields.created_at || new Date().toISOString(),
      updated_at: itemFields.updated_at || new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error

  if (quantity > 0 || expiryDate) {
    await addStockBatch(data.id, quantity, expiryDate)
  }

  return getItem(data.id)
}

export const createItems = async (items: any[]) => {
  const results: ItemWithStock[] = []

  for (const item of items) {
    const created = await createItem(item)
    results.push(created)
  }

  return results
}

export const updateItem = async (id: number, item: any) => {
  const quantity = Number(item.quantity) || 0
  const expiryDate = item.expiry_date || null
  const { quantity: _q, expiry_date: _e, batches: _b, id: _id, ...itemFields } = item

  const { data, error } = await supabase
    .from('items')
    .update({ ...itemFields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  if (quantity > 0 || expiryDate) {
    await addStockBatch(data.id, quantity, expiryDate)
  }

  return getItem(data.id)
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

export const stockIn = async (data: {
  item_id: number
  quantity: number
  notes?: string
  transaction_date?: string
  expiry_date?: string | null
}) => {
  const item = await getItem(data.item_id)
  if (!item) throw new Error('Item not found')

  const { error: transError } = await supabase.from('transactions').insert({
    item_id: data.item_id,
    type: 'IN',
    quantity: data.quantity,
    notes: data.notes || '',
    transaction_date: data.transaction_date || null,
  })

  if (transError) throw transError

  await addStockBatch(data.item_id, data.quantity, data.expiry_date ?? null)

  try {
    const { sendEmail, formatStockInEmail } = await import('./email')

    const { subject, html } = formatStockInEmail(
      item.name,
      data.quantity,
      item.unit || 'pcs',
      optionalSku(item.sku),
      data.notes
    )

    sendEmail({
      to: '',
      subject,
      html,
    }).catch((error) => {
      console.error('Email notification failed:', error)
    })
  } catch (error) {
    console.error('Error setting up email notification:', error)
  }
}

export const stockOut = async (data: {
  item_id: number
  quantity: number
  notes?: string
  shop?: string
  transaction_date?: string
}) => {
  const item = await getItem(data.item_id)
  if (!item) throw new Error('Item not found')
  if (item.quantity < data.quantity) {
    throw new Error(`Insufficient stock. Available: ${item.quantity}`)
  }

  const { error: transError } = await supabase.from('transactions').insert({
    item_id: data.item_id,
    type: 'OUT',
    quantity: data.quantity,
    notes: data.notes || '',
    shop: data.shop || null,
    transaction_date: data.transaction_date || null,
  })

  if (transError) throw transError

  await deductStockFefo(data.item_id, data.quantity)

  try {
    const { sendEmail, formatStockOutEmail } = await import('./email')

    const { subject, html } = formatStockOutEmail(
      item.name,
      data.quantity,
      item.unit || 'pcs',
      data.shop || 'Unknown',
      optionalSku(item.sku),
      data.notes
    )

    sendEmail({
      to: '',
      subject,
      html,
    }).catch((error) => {
      console.error('Email notification failed:', error)
    })
  } catch (error) {
    console.error('Error setting up email notification:', error)
  }
}

export const stockInMultiple = async (
  items: Array<{ item_id: number; quantity: number; notes?: string; expiry_date?: string | null }>,
  globalNotes?: string,
  transactionDate?: string
) => {
  const transactionsToInsert = items.map((data) => ({
    item_id: data.item_id,
    type: 'IN' as const,
    quantity: data.quantity,
    notes: data.notes || globalNotes || '',
    transaction_date: transactionDate || null,
  }))

  const { error: batchTransError } = await supabase
    .from('transactions')
    .insert(transactionsToInsert)

  if (batchTransError) throw batchTransError

  const itemDetails: any[] = []

  for (const data of items) {
    const item = await getItem(data.item_id)
    if (!item) throw new Error(`Item not found: ${data.item_id}`)

    await addStockBatch(data.item_id, data.quantity, data.expiry_date ?? null)

    itemDetails.push({
      name: item.name,
      sku: optionalSku(item.sku),
      unit: item.unit,
      quantity: item.quantity,
      transactionQuantity: data.quantity,
      transactionNotes: globalNotes,
    })
  }

  if (itemDetails.length > 0) {
    try {
      const { sendEmail, formatStockInEmailMultiple } = await import('./email')
      const { subject, html } = formatStockInEmailMultiple(itemDetails)

      sendEmail({
        to: '',
        subject,
        html,
      }).catch((error) => {
        console.error('Email notification failed:', error)
      })
    } catch (error) {
      console.error('Error setting up email notification:', error)
    }
  }
}

export const stockOutMultiple = async (
  items: Array<{ item_id: number; quantity: number; notes?: string }>,
  shop: string,
  globalNotes?: string,
  transactionDate?: string
) => {
  const totalsByItem = items.reduce(
    (acc, current) => {
      acc[current.item_id] = (acc[current.item_id] || 0) + current.quantity
      return acc
    },
    {} as Record<number, number>
  )

  const validatedItems: any[] = []
  for (const [itemIdStr, totalQuantity] of Object.entries(totalsByItem)) {
    const itemId = parseInt(itemIdStr)
    const item = await getItem(itemId)
    if (!item) throw new Error(`Item not found: ${itemId}`)
    if (item.quantity < totalQuantity) {
      throw new Error(
        `Insufficient stock for ${item.name}. Available: ${item.quantity}, Requested: ${totalQuantity}`
      )
    }
    validatedItems.push({ ...item, id: itemId, transactionTotal: totalQuantity })
  }

  const transactionsToInsert = items.map((data) => ({
    item_id: data.item_id,
    type: 'OUT' as const,
    quantity: data.quantity,
    notes: data.notes || globalNotes || '',
    shop: shop || null,
    transaction_date: transactionDate || null,
  }))

  const { error: batchTransError } = await supabase
    .from('transactions')
    .insert(transactionsToInsert)

  if (batchTransError) throw batchTransError

  const itemDetails: any[] = []
  for (const item of validatedItems) {
    await deductStockFefo(item.id, item.transactionTotal)

    itemDetails.push({
      name: item.name,
      sku: optionalSku(item.sku),
      unit: item.unit,
      quantity: item.quantity,
      transactionQuantity: item.transactionTotal,
      transactionNotes: globalNotes,
    })
  }

  if (itemDetails.length > 0) {
    try {
      const { sendEmail, formatStockOutEmailMultiple } = await import('./email')
      const { subject, html } = formatStockOutEmailMultiple(itemDetails, shop || 'Unknown')

      sendEmail({
        to: '',
        subject,
        html,
      }).catch((error) => {
        console.error('Email notification failed:', error)
      })
    } catch (error) {
      console.error('Error setting up email notification:', error)
    }
  }
}

export const deleteTransaction = async (transactionId: number) => {
  const { data: transaction, error: transError } = await supabase
    .from('transactions')
    .select('*, items(*)')
    .eq('id', transactionId)
    .single()

  if (transError) throw transError
  if (!transaction) throw new Error('Transaction not found')

  const currentStock = await getTotalStock(transaction.item_id)

  if (transaction.type === 'IN') {
    if (currentStock < transaction.quantity) {
      throw new Error(
        `Cannot undo stock in. Current stock (${currentStock}) is less than the quantity to remove (${transaction.quantity}).`
      )
    }
  }

  const { error: deleteError } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId)

  if (deleteError) throw deleteError

  if (transaction.type === 'OUT') {
    await addStockBatch(transaction.item_id, transaction.quantity, null)
  } else if (transaction.type === 'IN') {
    await deductStockFefo(transaction.item_id, transaction.quantity)
  }
}

// Dashboard
export const getDashboardSummary = async () => {
  const [itemsResult, transactionsResult] = await Promise.all([
    supabase.from(ITEMS_WITH_STOCK).select('*'),
    supabase
      .from('transactions')
      .select(`
      *,
      items (
        name,
        unit,
        sku
      )
    `)
      .order('created_at', { ascending: false }),
  ])

  if (itemsResult.error) throw itemsResult.error
  if (transactionsResult.error) throw transactionsResult.error

  const items = (itemsResult.data || []).map(normalizeItem)
  const transactions = transactionsResult.data || []

  const totalItems = items.length
  const lowStock = items.filter((item) => item.quantity <= item.min_stock).length
  const categories = Array.from(
    new Set(items.map((item) => item.category).filter(Boolean))
  ).length
  const totalValue = items.reduce(
    (sum, item) => sum + item.quantity * (item.price || 0),
    0
  )
  const lowStockItems = items
    .filter((item) => item.quantity <= item.min_stock)
    .sort((a, b) => {
      const ratioA = a.quantity / (a.min_stock || 1)
      const ratioB = b.quantity / (b.min_stock || 1)
      return ratioA - ratioB
    })
    .slice(0, 5)
  const topItems = [...items].sort((a, b) => b.quantity - a.quantity).slice(0, 7)

  const healthyItems = items.filter((item) => item.quantity > item.min_stock).length
  const healthPercent =
    items.length > 0 ? Math.round((healthyItems / items.length) * 100) : 100

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
