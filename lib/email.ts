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
  
  const itemsHtml = items.map((item) => `
    <div class="item-row">
      <div class="item-header">
        <strong>${item.name}</strong>
        ${item.sku ? `<span class="sku">SKU: ${item.sku}</span>` : ''}
      </div>
      <div class="item-details">
        <span class="label">Quantity:</span>
        <span>${item.transactionQuantity} ${item.unit || 'pcs'}</span>
        ${item.transactionNotes ? `<span class="notes">Notes: ${item.transactionNotes}</span>` : ''}
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
            margin: 15px 0;
            padding: 15px;
            background: #FDFCF8;
            border-left: 3px solid #78350F;
            border-radius: 4px;
          }
          .item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }
          .item-header strong {
            color: #1C1917;
            font-size: 16px;
          }
          .sku {
            font-size: 12px;
            color: #9A3412;
            font-family: monospace;
          }
          .item-details {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .item-details .label {
            min-width: 80px;
            font-size: 12px;
          }
          .notes {
            font-size: 12px;
            color: #78350F;
            font-style: italic;
            margin-top: 4px;
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

