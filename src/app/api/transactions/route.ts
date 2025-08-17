import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { transactionService } from '@/lib/transaction-service'
import { walletService } from '@/lib/wallet-service'
import { z } from 'zod'

const getTransactionsSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'FORWARDING', 'COMPLETED', 'FAILED', 'EXPIRED']).optional(),
  network: z.enum(['BTC', 'ETH', 'BSC', 'TRX', 'TON', 'SOL']).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0)
})

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'MERCHANT') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const merchantId = session.user.merchantId
    if (!merchantId) {
      return NextResponse.json(
        { error: 'Merchant profile not found' },
        { status: 400 }
      )
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const validatedParams = getTransactionsSchema.parse(queryParams)

    // Get transactions
    const result = await transactionService.getMerchantTransactions(merchantId, {
      status: validatedParams.status,
      network: validatedParams.network,
      limit: validatedParams.limit,
      offset: validatedParams.offset
    })

    // Format transactions with additional information
    const formattedTransactions = result.transactions.map(transaction => ({
      id: transaction.id,
      status: transaction.status,
      network: transaction.network,
      networkDisplayName: walletService.getNetworkDisplayName(transaction.network as any),
      networkSymbol: walletService.getNetworkSymbol(transaction.network as any),
      token: transaction.token,
      amount: transaction.amount,
      amountUsd: transaction.amountUsd,
      feeAmount: transaction.feeAmount,
      feeAmountUsd: transaction.feeAmountUsd,
      customerPaysFee: transaction.customerPaysFee,
      tempWalletAddress: transaction.tempWalletAddress,
      merchantWalletAddress: transaction.merchantWalletAddress,
      confirmations: transaction.confirmations,
      requiredConfirmations: transaction.requiredConfirmations,
      incomingTxHash: transaction.incomingTxHash,
      outgoingTxHash: transaction.outgoingTxHash,
      expiresAt: transaction.expiresAt,
      paidAt: transaction.paidAt,
      forwardedAt: transaction.forwardedAt,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      retryCount: transaction.retryCount,
      maxRetries: transaction.maxRetries,
      // Human readable amounts
      amountFormatted: walletService.convertFromSmallestUnit(transaction.amount, transaction.network as any),
      feeAmountFormatted: walletService.convertFromSmallestUnit(transaction.feeAmount, transaction.network as any),
      // Status-specific information
      isExpired: transaction.expiresAt < new Date(),
      timeRemaining: transaction.expiresAt > new Date() 
        ? Math.max(0, transaction.expiresAt.getTime() - Date.now())
        : 0,
      canRetry: transaction.status === 'FAILED' && transaction.retryCount < transaction.maxRetries,
      // Merchant information
      merchant: {
        id: transaction.merchant.id,
        websiteUrl: transaction.merchant.websiteUrl,
        webhookUrl: transaction.merchant.webhookUrl,
        isApproved: transaction.merchant.isApproved,
        name: transaction.merchant.user.name,
        email: transaction.merchant.user.email
      }
    }))

    return NextResponse.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.offset + result.limit < result.total
        }
      }
    })

  } catch (error) {
    console.error('Error fetching transactions:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
