import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

/**
 * Email service using Gmail SMTP
 * Requires: Gmail App Password (not regular password)
 * Get App Password from: https://myaccount.google.com/apppasswords
 */
export async function POST(request: NextRequest) {
  try {
    const { to, subject, html } = await request.json()

    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const fromEmail = process.env.EMAIL_FROM || smtpUser
    const recipientEmail = process.env.EMAIL_RECIPIENT || to

    // If SMTP is not configured, skip sending
    if (!smtpUser || !smtpPass) {
      console.warn('Email not configured. Set SMTP_USER and SMTP_PASS in environment variables.')
      return NextResponse.json(
        { success: false, message: 'Email not configured' },
        { status: 200 } // Don't fail, just skip
      )
    }

    // If recipient email is not configured, skip sending
    if (!recipientEmail) {
      console.warn('Email recipient not configured. Set EMAIL_RECIPIENT in environment variables.')
      return NextResponse.json(
        { success: false, message: 'Email recipient not configured' },
        { status: 200 } // Don't fail, just skip
      )
    }

    // Create Gmail SMTP transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass, // App Password, not regular password
      },
    })

    // Send email
    const info = await transporter.sendMail({
      from: fromEmail,
      to: recipientEmail,
      subject: subject,
      html: html,
    })

    console.log('Email sent successfully:', info.messageId, 'to:', recipientEmail)
    return NextResponse.json({ success: true, messageId: info.messageId })
  } catch (error: any) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 200 } // Don't fail the request
    )
  }
}

