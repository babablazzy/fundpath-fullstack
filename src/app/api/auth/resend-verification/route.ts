import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/email'
import { z } from 'zod'

const resendSchema = z.object({
  email: z.string().email('Invalid email address')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = resendSchema.parse(body)

    // Resend verification email
    const emailSent = await emailService.resendVerificationEmail(validatedData.email)

    if (!emailSent) {
      return NextResponse.json(
        { error: 'User not found or email already verified' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully'
    })

  } catch (error) {
    console.error('Resend verification error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
