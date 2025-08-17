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

    // Get recent merchants
    const recentMerchants = await prisma.merchant.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    })

    // Get recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        merchant: {
          include: {
            user: {
              select: { name: true }
            }
          }
        }
      }
    })

    // Combine and format activity
    const activity = []

    // Add merchant registrations
    recentMerchants.forEach(merchant => {
      activity.push({
        id: `merchant_${merchant.id}`,
        type: 'merchant_registered',
        description: `New merchant registered: ${merchant.user.name} (${merchant.user.email})`,
        timestamp: merchant.createdAt,
        merchantName: merchant.user.name
      })
    })

    // Add transaction activities
    recentTransactions.forEach(transaction => {
      activity.push({
        id: `transaction_${transaction.id}`,
        type: transaction.status === 'COMPLETED' ? 'transaction_completed' : 
              transaction.status === 'FAILED' ? 'transaction_failed' : 'transaction_created',
        description: `${transaction.status} transaction: ${transaction.amount} ${transaction.network.toUpperCase()} from ${transaction.merchant.user.name}`,
        timestamp: transaction.createdAt,
        transactionId: transaction.id,
        merchantName: transaction.merchant.user.name
      })
    })

    // Sort by timestamp and take the most recent
    activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    return NextResponse.json(activity.slice(0, 20))
  } catch (error) {
    console.error('Error fetching admin activity:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
