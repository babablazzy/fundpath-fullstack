import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get merchant statistics
    const [totalMerchants, activeMerchants, pendingMerchants] = await Promise.all([
      prisma.merchant.count(),
      prisma.merchant.count({
        where: { isApproved: true }
      }),
      prisma.merchant.count({
        where: { isApproved: false }
      })
    ])

    // Get transaction statistics
    const [totalTransactions, pendingTransactions, completedTransactions, failedTransactions] = await Promise.all([
      prisma.transaction.count(),
      prisma.transaction.count({
        where: { status: 'PENDING' }
      }),
      prisma.transaction.count({
        where: { status: 'COMPLETED' }
      }),
      prisma.transaction.count({
        where: { status: 'FAILED' }
      })
    ])

    // Get financial statistics
    const [volumeResult, feesResult] = await Promise.all([
      prisma.transaction.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amountUsd: true }
      }),
      prisma.transaction.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { feeAmount: true }
      })
    ])

    const stats = {
      totalMerchants,
      activeMerchants,
      pendingMerchants,
      totalTransactions,
      pendingTransactions,
      completedTransactions,
      failedTransactions,
      totalVolume: volumeResult._sum.amountUsd || 0,
      totalFees: feesResult._sum.feeAmount || 0
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
