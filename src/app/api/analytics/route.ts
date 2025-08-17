import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const timeRangeSchema = z.object({
  timeRange: z.enum(['7d', '30d', '90d', '1y']).default('30d')
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const { timeRange } = timeRangeSchema.parse({
      timeRange: searchParams.get('timeRange') || '30d'
    })

    // Calculate date range
    const now = new Date()
    let startDate: Date
    
    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // Get all transactions for the merchant in the time range
    const transactions = await prisma.transaction.findMany({
      where: {
        merchantId: session.user.merchantId,
        createdAt: {
          gte: startDate,
          lte: now
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Calculate basic metrics
    const totalVolume = transactions.reduce((sum, t) => sum + (t.amountUsd || 0), 0)
    const totalTransactions = transactions.length
    const completedTransactions = transactions.filter(t => t.status === 'COMPLETED').length
    const successRate = totalTransactions > 0 ? (completedTransactions / totalTransactions) * 100 : 0
    const totalFees = transactions.reduce((sum, t) => sum + (t.feeAmount || 0), 0)
    const averageTransactionValue = totalTransactions > 0 ? totalVolume / totalTransactions : 0

    // Generate monthly data
    const monthlyData = generateMonthlyData(transactions, startDate, now)

    // Calculate network distribution
    const networkDistribution = calculateNetworkDistribution(transactions)

    // Calculate status distribution
    const statusDistribution = calculateStatusDistribution(transactions)

    // Generate recent trends (last 30 days)
    const recentTrends = generateRecentTrends(transactions, 30)

    return NextResponse.json({
      totalVolume,
      totalTransactions,
      successRate,
      averageTransactionValue,
      totalFees,
      monthlyData,
      networkDistribution,
      statusDistribution,
      recentTrends
    })
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}

function generateMonthlyData(transactions: any[], startDate: Date, endDate: Date) {
  const monthlyData: Array<{
    month: string
    volume: number
    transactions: number
    fees: number
  }> = []

  const current = new Date(startDate)
  current.setDate(1) // Start from first day of month

  while (current <= endDate) {
    const monthStart = new Date(current.getFullYear(), current.getMonth(), 1)
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0)

    const monthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.createdAt)
      return transactionDate >= monthStart && transactionDate <= monthEnd
    })

    const volume = monthTransactions.reduce((sum, t) => sum + (t.amountUsd || 0), 0)
    const fees = monthTransactions.reduce((sum, t) => sum + (t.feeAmount || 0), 0)

    monthlyData.push({
      month: monthStart.toISOString(),
      volume,
      transactions: monthTransactions.length,
      fees
    })

    current.setMonth(current.getMonth() + 1)
  }

  return monthlyData
}

function calculateNetworkDistribution(transactions: any[]) {
  const networkMap = new Map<string, { volume: number; transactions: number }>()

  transactions.forEach(transaction => {
    const network = transaction.network
    const current = networkMap.get(network) || { volume: 0, transactions: 0 }
    
    current.volume += transaction.amountUsd || 0
    current.transactions += 1
    
    networkMap.set(network, current)
  })

  const totalVolume = transactions.reduce((sum, t) => sum + (t.amountUsd || 0), 0)

  return Array.from(networkMap.entries()).map(([network, data]) => ({
    network,
    volume: data.volume,
    transactions: data.transactions,
    percentage: totalVolume > 0 ? (data.volume / totalVolume) * 100 : 0
  })).sort((a, b) => b.volume - a.volume)
}

function calculateStatusDistribution(transactions: any[]) {
  const statusMap = new Map<string, number>()

  transactions.forEach(transaction => {
    const status = transaction.status
    statusMap.set(status, (statusMap.get(status) || 0) + 1)
  })

  const total = transactions.length

  return Array.from(statusMap.entries()).map(([status, count]) => ({
    status,
    count,
    percentage: total > 0 ? (count / total) * 100 : 0
  })).sort((a, b) => b.count - a.count)
}

function generateRecentTrends(transactions: any[], days: number) {
  const trends: Array<{
    date: string
    volume: number
    transactions: number
  }> = []

  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)

  for (let i = 0; i < days; i++) {
    const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
    const nextDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)

    const dayTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.createdAt)
      return transactionDate >= currentDate && transactionDate < nextDate
    })

    const volume = dayTransactions.reduce((sum, t) => sum + (t.amountUsd || 0), 0)

    trends.push({
      date: currentDate.toISOString().split('T')[0],
      volume,
      transactions: dayTransactions.length
    })
  }

  return trends
}
