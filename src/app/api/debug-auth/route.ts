import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    await prisma.$connect()
    
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        emailVerified: true,
        twoFactorEnabled: true,
        createdAt: true
      }
    })

    // Check environment variables
    const envCheck = {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set'
    }

    return NextResponse.json({
      success: true,
      databaseConnected: true,
      userCount: users.length,
      users: users,
      environment: envCheck
    })
  } catch (error) {
    console.error('Debug auth error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      databaseConnected: false
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({
        error: 'Email and password required'
      }, { status: 400 })
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        merchant: true,
        admin: true
      }
    })

    if (!user) {
      return NextResponse.json({
        error: 'User not found',
        email: email
      }, { status: 404 })
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password)

    return NextResponse.json({
      userFound: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        hasMerchant: !!user.merchant,
        hasAdmin: !!user.admin
      },
      passwordValid: isPasswordValid,
      canLogin: isPasswordValid && user.isActive && (user.role === 'ADMIN' || user.emailVerified)
    })
  } catch (error) {
    console.error('Debug login error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

