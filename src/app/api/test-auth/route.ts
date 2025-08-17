import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        emailVerified: true
      }
    })

    // Test password hashing
    const testPassword = 'admin123'
    const hashedPassword = await bcrypt.hash(testPassword, 12)
    const isValid = await bcrypt.compare(testPassword, hashedPassword)

    return NextResponse.json({
      success: true,
      databaseConnection: 'OK',
      passwordHashing: isValid ? 'OK' : 'FAILED',
      users: users,
      testCredentials: {
        admin: {
          email: 'admin@fundpath.com',
          password: 'admin123'
        },
        merchant: {
          email: 'merchant@example.com',
          password: 'merchant123'
        }
      }
    })
  } catch (error) {
    console.error('Test auth error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
