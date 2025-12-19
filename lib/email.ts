/**
 * Email notification service using Resend API (Free tier available)
 * Alternative: You can use SMTP or other email services
 */

interface EmailMessage {
  to: string
  subject: string
  html: string
}

/**
 * Send email via Next.js API route
 */
export async function sendEmail({ to, subject, html }: EmailMessage): Promise<boolean> {
  try {
    const response = await fetch('/api/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, html }),
    })

    const data = await response.json()
    return data.success === true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

/**
 * Format stock out notification email
 */
export function formatStockOutEmail(
  itemName: string,
  quantity: number,
  unit: string,
  shop: string,
  sku?: string,
  notes?: string
): { subject: string; html: string } {
  const subject = `📦 Stock Out: ${itemName} → ${shop}`
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Roboto', Arial, sans-serif;
            line-height: 1.6;
            color: #1C1917;
            background-color: #FDFCF8;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            border-bottom: 2px solid #78350F;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            margin: 0;
            color: #1C1917;
            font-size: 24px;
          }
          .info-row {
            margin: 15px 0;
            padding: 10px;
            background: #FDFCF8;
            border-left: 3px solid #78350F;
          }
          .label {
            font-weight: 600;
            color: #78350F;
            display: inline-block;
            min-width: 120px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #E7E5E4;
            font-size: 12px;
            color: #9A3412;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📦 Stock Out Notification</h1>
          </div>
          
          <div class="info-row">
            <span class="label">Item:</span>
            <span>${itemName}</span>
          </div>
          
          ${sku ? `
          <div class="info-row">
            <span class="label">SKU:</span>
            <span>${sku}</span>
          </div>
          ` : ''}
          
          <div class="info-row">
            <span class="label">Quantity:</span>
            <span>${quantity} ${unit}</span>
          </div>
          
          <div class="info-row">
            <span class="label">Destination:</span>
            <span><strong>${shop}</strong></span>
          </div>
          
          ${notes ? `
          <div class="info-row">
            <span class="label">Notes:</span>
            <span>${notes}</span>
          </div>
          ` : ''}
          
          <div class="info-row">
            <span class="label">Time:</span>
            <span>${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</span>
          </div>
          
          <div class="footer">
            <p>VitaStore Inventory Management System</p>
            <p>This is an automated notification</p>
          </div>
        </div>
      </body>
    </html>
  `

  return { subject, html }
}

/**
 * Format stock out notification email for multiple items
 */
export function formatStockOutEmailMultiple(
  items: Array<{ name: string; sku?: string; unit?: string; transactionQuantity: number; transactionNotes?: string }>,
  shop: string
): { subject: string; html: string } {
  const itemCount = items.length
  const subject = `📦 Stock Out: ${itemCount} item${itemCount > 1 ? 's' : ''} → ${shop}`
  
  const itemsHtml = items.map((item, index) => `
    <div class="item-row">
      <div class="item-content">
        <div class="item-name">${item.name}</div>
        ${item.sku ? `<div class="sku">SKU: ${item.sku}</div>` : ''}
        <div class="quantity">Quantity: ${item.transactionQuantity} ${item.unit || 'pcs'}</div>
        ${item.transactionNotes ? `
        <div class="item-notes">
          <span class="notes-label">Note:</span>
          <span class="notes-text">${item.transactionNotes}</span>
        </div>
        ` : ''}
      </div>
    </div>
  `).join('')
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Roboto', Arial, sans-serif;
            line-height: 1.6;
            color: #1C1917;
            background-color: #FDFCF8;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            border-bottom: 2px solid #78350F;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            margin: 0;
            color: #1C1917;
            font-size: 24px;
          }
          .info-row {
            margin: 15px 0;
            padding: 10px;
            background: #FDFCF8;
            border-left: 3px solid #78350F;
          }
          .label {
            font-weight: 600;
            color: #78350F;
            display: inline-block;
            min-width: 120px;
          }
          .item-row {
            margin: 12px 0;
            padding: 12px 15px;
            background: #FDFCF8;
            border-left: 3px solid #78350F;
            border-radius: 4px;
          }
          .item-content {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .item-content .item-name {
            color: #1C1917;
            font-size: 15px;
            font-weight: 500;
            line-height: 1.5;
            margin-bottom: 2px;
          }
          .item-content .sku {
            font-size: 12px;
            color: #9A3412;
            font-family: 'Roboto', monospace;
            font-weight: 500;
            line-height: 1.5;
          }
          .item-content .quantity {
            color: #78350F;
            font-weight: 600;
            font-size: 14px;
            font-family: 'Roboto', monospace;
            line-height: 1.5;
          }
          .item-notes {
            margin-top: 6px;
            font-size: 12px;
            color: #78350F;
          }
          .item-notes .notes-label {
            font-weight: 600;
            margin-right: 6px;
          }
          .item-notes .notes-text {
            font-style: italic;
            color: #9A3412;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #E7E5E4;
            font-size: 12px;
            color: #9A3412;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📦 Stock Out Notification</h1>
          </div>
          
          <div class="info-row">
            <span class="label">Destination:</span>
            <span><strong>${shop}</strong></span>
          </div>
          
          <div class="info-row">
            <span class="label">Items:</span>
            <span>${itemCount} item${itemCount > 1 ? 's' : ''}</span>
          </div>
          
          ${itemsHtml}
          
          <div class="info-row">
            <span class="label">Time:</span>
            <span>${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</span>
          </div>
          
          <div class="footer">
            <p>VitaStore Inventory Management System</p>
            <p>This is an automated notification</p>
          </div>
        </div>
      </body>
    </html>
  `

  return { subject, html }
}

/**
 * Format stock in notification email
 */
export function formatStockInEmail(
  itemName: string,
  quantity: number,
  unit: string,
  sku?: string,
  notes?: string
): { subject: string; html: string } {
  const subject = `📥 Stock In: ${itemName}`
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Roboto', Arial, sans-serif;
            line-height: 1.6;
            color: #1C1917;
            background-color: #FDFCF8;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            border-bottom: 2px solid #059669;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            margin: 0;
            color: #1C1917;
            font-size: 24px;
          }
          .info-row {
            margin: 15px 0;
            padding: 10px;
            background: #FDFCF8;
            border-left: 3px solid #059669;
          }
          .label {
            font-weight: 600;
            color: #059669;
            display: inline-block;
            min-width: 120px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #E7E5E4;
            font-size: 12px;
            color: #9A3412;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📥 Stock In Notification</h1>
          </div>
          
          <div class="info-row">
            <span class="label">Item:</span>
            <span>${itemName}</span>
          </div>
          
          ${sku ? `
          <div class="info-row">
            <span class="label">SKU:</span>
            <span>${sku}</span>
          </div>
          ` : ''}
          
          <div class="info-row">
            <span class="label">Quantity:</span>
            <span><strong>+${quantity} ${unit}</strong></span>
          </div>
          
          ${notes ? `
          <div class="info-row">
            <span class="label">Notes:</span>
            <span>${notes}</span>
          </div>
          ` : ''}
          
          <div class="info-row">
            <span class="label">Time:</span>
            <span>${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</span>
          </div>
          
          <div class="footer">
            <p>VitaStore Inventory Management System</p>
            <p>This is an automated notification</p>
          </div>
        </div>
      </body>
    </html>
  `

  return { subject, html }
}

/**
 * Format stock in notification email for multiple items
 */
export function formatStockInEmailMultiple(
  items: Array<{ name: string; sku?: string; unit?: string; transactionQuantity: number; transactionNotes?: string }>
): { subject: string; html: string } {
  const itemCount = items.length
  const subject = `📥 Stock In: ${itemCount} item${itemCount > 1 ? 's' : ''}`
  
  const itemsHtml = items.map((item, index) => `
    <div class="item-row">
      <div class="item-content">
        <div class="item-name">${item.name}</div>
        ${item.sku ? `<div class="sku">SKU: ${item.sku}</div>` : ''}
        <div class="quantity">Quantity: +${item.transactionQuantity} ${item.unit || 'pcs'}</div>
        ${item.transactionNotes ? `
        <div class="item-notes">
          <span class="notes-label">Note:</span>
          <span class="notes-text">${item.transactionNotes}</span>
        </div>
        ` : ''}
      </div>
    </div>
  `).join('')
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Roboto', Arial, sans-serif;
            line-height: 1.6;
            color: #1C1917;
            background-color: #FDFCF8;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            border-bottom: 2px solid #059669;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            margin: 0;
            color: #1C1917;
            font-size: 24px;
          }
          .info-row {
            margin: 15px 0;
            padding: 10px;
            background: #FDFCF8;
            border-left: 3px solid #059669;
          }
          .label {
            font-weight: 600;
            color: #059669;
            display: inline-block;
            min-width: 120px;
          }
          .item-row {
            margin: 12px 0;
            padding: 12px 15px;
            background: #FDFCF8;
            border-left: 3px solid #059669;
            border-radius: 4px;
          }
          .item-content {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .item-content .item-name {
            color: #1C1917;
            font-size: 15px;
            font-weight: 500;
            line-height: 1.5;
            margin-bottom: 2px;
          }
          .item-content .sku {
            font-size: 12px;
            color: #9A3412;
            font-family: 'Roboto', monospace;
            font-weight: 500;
            line-height: 1.5;
          }
          .item-content .quantity {
            color: #059669;
            font-weight: 600;
            font-size: 14px;
            font-family: 'Roboto', monospace;
            line-height: 1.5;
          }
          .item-notes {
            margin-top: 6px;
            font-size: 12px;
            color: #059669;
          }
          .item-notes .notes-label {
            font-weight: 600;
            margin-right: 6px;
          }
          .item-notes .notes-text {
            font-style: italic;
            color: #9A3412;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #E7E5E4;
            font-size: 12px;
            color: #9A3412;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📥 Stock In Notification</h1>
          </div>
          
          <div class="info-row">
            <span class="label">Items:</span>
            <span>${itemCount} item${itemCount > 1 ? 's' : ''}</span>
          </div>
          
          ${itemsHtml}
          
          <div class="info-row">
            <span class="label">Time:</span>
            <span>${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</span>
          </div>
          
          <div class="footer">
            <p>VitaStore Inventory Management System</p>
            <p>This is an automated notification</p>
          </div>
        </div>
      </body>
    </html>
  `

  return { subject, html }
}
