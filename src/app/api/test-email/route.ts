import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function GET(request: NextRequest) {
  try {
    const config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }

    // Check if all required variables are set
    const missingVars = []
    if (!config.host) missingVars.push('SMTP_HOST')
    if (!config.port) missingVars.push('SMTP_PORT')
    if (!config.user) missingVars.push('SMTP_USER')
    if (!config.pass) missingVars.push('SMTP_PASS')

    if (missingVars.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
        missing: missingVars,
        config: {
          host: config.host || 'NOT_SET',
          port: config.port || 'NOT_SET',
          user: config.user || 'NOT_SET',
          pass: config.pass ? 'SET' : 'NOT_SET'
        }
      })
    }

    // Test SMTP connection
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass
      }
    })

    // Verify connection
    await transporter.verify()

    return NextResponse.json({
      success: true,
      message: 'SMTP connection successful',
      config: {
        host: config.host,
        port: config.port,
        user: config.user,
        pass: 'SET'
      }
    })

  } catch (error) {
    console.error('Email test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      config: {
        host: process.env.SMTP_HOST || 'NOT_SET',
        port: process.env.SMTP_PORT || 'NOT_SET',
        user: process.env.SMTP_USER || 'NOT_SET',
        pass: process.env.SMTP_PASS ? 'SET' : 'NOT_SET'
      }
    }, { status: 500 })
  }
}
