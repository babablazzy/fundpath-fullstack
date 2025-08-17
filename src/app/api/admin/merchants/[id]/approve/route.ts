import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    // Check if merchant exists
    const existingMerchant = await prisma.merchant.findUnique({
      where: { id },
      include: { user: true }
    })

    if (!existingMerchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    }

    if (existingMerchant.isApproved) {
      return NextResponse.json({ error: 'Merchant is already approved' }, { status: 400 })
    }

    // Approve the merchant
    const updatedMerchant = await prisma.merchant.update({
      where: { id },
      data: { isApproved: true },
      include: { user: true }
    })

    return NextResponse.json({
      message: 'Merchant approved successfully',
      merchant: updatedMerchant
    })
  } catch (error) {
    console.error('Approve merchant error:', error)
    return NextResponse.json(
      { error: 'Failed to approve merchant' },
      { status: 500 }
    )
  }
}
