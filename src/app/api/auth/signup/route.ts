import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { emailService } from '@/lib/email'
import { EmailQueueService } from '@/lib/email-queue'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import crypto from 'crypto'
import { Prisma } from '@prisma/client'
import { signupRateLimiter } from '@/lib/rate-limit'

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
})

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = signupRateLimiter(request)
  if (rateLimitResult) {
    return rateLimitResult
  }
  try {
    const body = await request.json()
    const validatedData = signupSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    // Create user and merchant in a transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: validatedData.email,
          password: hashedPassword,
          name: validatedData.name,
          role: 'MERCHANT',
          isActive: true
        }
      })

      // Create merchant profile without website URL initially
      const merchant = await tx.merchant.create({
        data: {
          userId: user.id,
          websiteUrl: '', // Empty initially, will be set when creating API key
          expectedTurnover: 'below_10k', // Default value
          apiKey: `fp_${crypto.randomUUID().replace(/-/g, '')}`,
          isApproved: false
        }
      })

      // Create default network preferences
      const networks = ['bitcoin', 'ethereum', 'solana', 'ton', 'bsc', 'tron']
      const networkPreferences = networks.map(network => ({
        merchantId: merchant.id,
        network,
        isEnabled: true,
        feeRate: 0.5,
        customerPaysFee: false
      }))

      await tx.networkPreference.createMany({
        data: networkPreferences
      })

      return { user, merchant }
    })

    // Queue verification email
    try {
      await EmailQueueService.addVerificationEmail(
        result.user.id,
        result.user.email,
        result.user.name
      )
      
      return NextResponse.json({
        success: true,
        message: 'Account created successfully. Please check your email to verify your account.'
      })
    } catch (emailError) {
      console.error('Failed to queue verification email:', emailError)
      
      // Fallback to direct email sending
      let emailSent = false
      try {
        emailSent = await emailService.sendVerificationEmail(
          result.user.id,
          result.user.email,
          result.user.name
        )
      } catch (fallbackError) {
        console.error('Failed to send verification email (fallback):', fallbackError)
      }

      if (!emailSent) {
        console.warn('Email service not configured or failed to send verification email for user:', result.user.id)
        return NextResponse.json({
          success: true,
          message: 'Account created successfully. Please contact support to verify your email.',
          warning: 'Email verification not sent due to configuration issues'
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Account created successfully. Please check your email to verify your account.'
      })
    }

  } catch (error) {
    console.error('Signup error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
