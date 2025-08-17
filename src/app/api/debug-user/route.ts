import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true
      }
    })

    if (!user) {
      return NextResponse.json({
        found: false,
        message: 'User not found in database'
      })
    }

    return NextResponse.json({
      found: true,
      user: user,
      canResendVerification: !user.emailVerified,
      message: user.emailVerified 
        ? 'Email is already verified' 
        : 'Email is not verified - can resend verification'
    })

  } catch (error) {
    console.error('Debug user error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
