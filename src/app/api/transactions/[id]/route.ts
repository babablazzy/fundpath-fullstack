import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        merchant: {
          select: {
            businessName: true,
            websiteUrl: true
          }
        }
      }
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Check if transaction has expired
    if (transaction.expiresAt && new Date() > transaction.expiresAt) {
      await prisma.transaction.update({
        where: { id },
        data: { status: 'EXPIRED' }
      })
      transaction.status = 'EXPIRED'
    }

    return NextResponse.json({
      id: transaction.id,
      amount: transaction.amount,
      network: transaction.network,
      merchantWalletAddress: transaction.merchantWalletAddress,
      platformWalletAddress: transaction.tempWalletAddress,
      status: transaction.status,
      expiresAt: transaction.expiresAt?.toISOString(),
      createdAt: transaction.createdAt.toISOString(),
      merchant: {
        name: transaction.merchant.businessName || 'Merchant',
        websiteUrl: transaction.merchant.websiteUrl
      }
    })

  } catch (error) {
    console.error('Error fetching transaction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
