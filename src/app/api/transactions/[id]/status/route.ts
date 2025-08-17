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
        webhookEvents: {
          orderBy: { createdAt: 'desc' },
          take: 1
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
      status: transaction.status,
      paid: transaction.paidAt !== null,
      confirmations: transaction.confirmations || 0,
      paidAt: transaction.paidAt?.toISOString(),
      lastWebhookEvent: transaction.webhookEvents[0]?.eventType || null
    })

  } catch (error) {
    console.error('Error fetching transaction status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
