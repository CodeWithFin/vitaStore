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

export const createItems = async (items: any[]) => {
  const { data, error } = await supabase.from('items').insert(items).select()
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

export const stockIn = async (data: { item_id: number; quantity: number; notes?: string; transaction_date?: string }) => {
  // Get item details for email
  const { data: item } = await supabase.from('items').select('name, sku, unit, quantity').eq('id', data.item_id).single()
  if (!item) throw new Error('Item not found')

  const { error: transError } = await supabase.from('transactions').insert({
    item_id: data.item_id,
    type: 'IN',
    quantity: data.quantity,
    notes: data.notes || '',
    transaction_date: data.transaction_date || null,
  })

  if (transError) throw transError

  // Update item quantity
  const { error: updateError } = await supabase
    .from('items')
    .update({ 
      quantity: item.quantity + data.quantity,
      updated_at: new Date().toISOString()
    })
    .eq('id', data.item_id)

  if (updateError) throw updateError

  // Send email notification (non-blocking)
  try {
    const { sendEmail, formatStockInEmail } = await import('./email')
    
    const { subject, html } = formatStockInEmail(
      item.name,
      data.quantity,
      item.unit || 'pcs',
      item.sku,
      data.notes
    )
    
    // Send asynchronously (don't wait for response)
    sendEmail({
      to: '', // Will be set by API route from server env
      subject,
      html,
    }).catch((error) => {
      console.error('Email notification failed:', error)
      // Don't throw - notification failure shouldn't break the transaction
    })
  } catch (error) {
    console.error('Error setting up email notification:', error)
    // Don't throw - notification failure shouldn't break the transaction
  }
}

export const stockOut = async (data: { item_id: number; quantity: number; notes?: string; shop?: string; transaction_date?: string }) => {
  // Check stock availability and get item details
  const { data: item } = await supabase.from('items').select('name, sku, unit, quantity').eq('id', data.item_id).single()
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

  // Update item quantity
  const { error: updateError } = await supabase
    .from('items')
    .update({ 
      quantity: item.quantity - data.quantity,
      updated_at: new Date().toISOString()
    })
    .eq('id', data.item_id)

  if (updateError) throw updateError

  // Send email notification (non-blocking)
  try {
    const { sendEmail, formatStockOutEmail } = await import('./email')
    
    const { subject, html } = formatStockOutEmail(
      item.name,
      data.quantity,
      item.unit || 'pcs',
      data.shop || 'Unknown',
      item.sku,
      data.notes
    )
    
    // Send asynchronously (don't wait for response)
    // The API route will read EMAIL_RECIPIENT from server-side env
    sendEmail({
      to: '', // Will be set by API route from server env
      subject,
      html,
    }).catch((error) => {
      console.error('Email notification failed:', error)
      // Don't throw - notification failure shouldn't break the transaction
    })
  } catch (error) {
    console.error('Error setting up email notification:', error)
    // Don't throw - notification failure shouldn't break the transaction
  }
}

// Process multiple stock in transactions
export const stockInMultiple = async (
  items: Array<{ item_id: number; quantity: number; notes?: string }>,
  globalNotes?: string,
  transactionDate?: string
) => {
  // 1. Prepare transactions for batch insert
  const transactionsToInsert = items.map(data => ({
    item_id: data.item_id,
    type: 'IN',
    quantity: data.quantity,
    notes: data.notes || globalNotes || '',
    transaction_date: transactionDate || null,
  }))

  // 2. Batch insert transactions
  const { error: batchTransError } = await supabase
    .from('transactions')
    .insert(transactionsToInsert)

  if (batchTransError) throw batchTransError

  // 3. Group and sum quantities by item_id to minimize database calls and avoid race conditions
  const totalsByItem = items.reduce((acc, current) => {
    acc[current.item_id] = (acc[current.item_id] || 0) + current.quantity
    return acc
  }, {} as Record<number, number>)

  // 4. Update item quantities sequentially to ensure accuracy
  const itemDetails: any[] = []
  for (const [itemIdStr, totalQuantity] of Object.entries(totalsByItem)) {
    const itemId = parseInt(itemIdStr)
    
    // Get current item details
    const { data: item, error: fetchError } = await supabase
      .from('items')
      .select('name, sku, unit, quantity')
      .eq('id', itemId)
      .single()
    
    if (fetchError || !item) throw new Error(`Item not found: ${itemId}`)

    // Update item quantity
    const { error: updateError } = await supabase
      .from('items')
      .update({ 
        quantity: item.quantity + totalQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)

    if (updateError) throw updateError

    itemDetails.push({
      ...item,
      transactionQuantity: totalQuantity,
      transactionNotes: globalNotes,
    })
  }

  // 5. Send email notification (non-blocking)
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

// Process multiple stock out transactions
export const stockOutMultiple = async (
  items: Array<{ item_id: number; quantity: number; notes?: string }>,
  shop: string,
  globalNotes?: string,
  transactionDate?: string
) => {
  // 1. Group and sum quantities by item_id
  const totalsByItem = items.reduce((acc, current) => {
    acc[current.item_id] = (acc[current.item_id] || 0) + current.quantity
    return acc
  }, {} as Record<number, number>)

  // 2. Validate all items have sufficient stock (sequentially to be safe)
  const validatedItems: any[] = []
  for (const [itemIdStr, totalQuantity] of Object.entries(totalsByItem)) {
    const itemId = parseInt(itemIdStr)
    const { data: item } = await supabase.from('items').select('name, sku, unit, quantity').eq('id', itemId).single()
    if (!item) throw new Error(`Item not found: ${itemId}`)
    if (item.quantity < totalQuantity) {
      throw new Error(`Insufficient stock for ${item.name}. Available: ${item.quantity}, Requested: ${totalQuantity}`)
    }
    validatedItems.push({ ...item, id: itemId, transactionTotal: totalQuantity })
  }
  
  // 3. Prepare transactions for batch insert
  const transactionsToInsert = items.map(data => ({
    item_id: data.item_id,
    type: 'OUT',
    quantity: data.quantity,
    notes: data.notes || globalNotes || '',
    shop: shop || null,
    transaction_date: transactionDate || null,
  }))

  // 4. Batch insert transactions
  const { error: batchTransError } = await supabase
    .from('transactions')
    .insert(transactionsToInsert)

  if (batchTransError) throw batchTransError

  // 5. Update item quantities sequentially
  const itemDetails: any[] = []
  for (const item of validatedItems) {
    const { error: updateError } = await supabase
      .from('items')
      .update({ 
        quantity: item.quantity - item.transactionTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', item.id)

    if (updateError) throw updateError

    itemDetails.push({
      name: item.name,
      sku: item.sku,
      unit: item.unit,
      quantity: item.quantity,
      transactionQuantity: item.transactionTotal,
      transactionNotes: globalNotes,
    })
  }

  // Send email notification with all items (non-blocking)
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

// Delete a transaction and restore or reverse stock
export const deleteTransaction = async (transactionId: number) => {
  // Get transaction details
  const { data: transaction, error: transError } = await supabase
    .from('transactions')
    .select('*, items(*)')
    .eq('id', transactionId)
    .single()

  if (transError) throw transError
  if (!transaction) throw new Error('Transaction not found')

  // Get current item quantity
  const { data: item } = await supabase
    .from('items')
    .select('quantity')
    .eq('id', transaction.item_id)
    .single()

  if (!item) throw new Error('Item not found')

  // Calculate new quantity
  let newQuantity = item.quantity
  if (transaction.type === 'OUT') {
    // Reversing a stock out means adding it back
    newQuantity += transaction.quantity
  } else if (transaction.type === 'IN') {
    // Reversing a stock in means taking it away
    newQuantity -= transaction.quantity
    if (newQuantity < 0) {
      throw new Error(`Cannot undo stock in. Current stock (${item.quantity}) is less than the quantity to remove (${transaction.quantity}).`)
    }
  }

  // Delete the transaction
  const { error: deleteError } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId)

  if (deleteError) throw deleteError

  // Update the stock
  const { error: updateError } = await supabase
    .from('items')
    .update({
      quantity: newQuantity,
      updated_at: new Date().toISOString()
    })
    .eq('id', transaction.item_id)

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
    `).order('created_at', { ascending: false }),
  ])

  if (itemsResult.error) throw itemsResult.error
  if (transactionsResult.error) throw transactionsResult.error

  const items = itemsResult.data || []
  const transactions = transactionsResult.data || []

  const totalItems = items.length
  const lowStock = items.filter((item: any) => item.quantity <= item.min_stock).length
  const categories = Array.from(new Set(items.map((item: any) => item.category).filter(Boolean))).length
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

