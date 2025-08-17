import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const statusSchema = z.object({
  isActive: z.boolean()
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { isActive } = statusSchema.parse(body)

    // Check if merchant exists
    const existingMerchant = await prisma.merchant.findUnique({
      where: { id },
      include: { user: true }
    })

    if (!existingMerchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id: existingMerchant.userId },
      data: { isActive },
      include: { merchant: true }
    })

    return NextResponse.json({
      message: `Merchant ${isActive ? 'activated' : 'suspended'} successfully`,
      user: updatedUser
    })
  } catch (error) {
    console.error('Toggle merchant status error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update merchant status' },
      { status: 500 }
    )
  }
}
