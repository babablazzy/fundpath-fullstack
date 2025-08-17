import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { transactionService } from '@/lib/transaction-service'
import { walletService } from '@/lib/wallet-service'
import { z } from 'zod'

const createTransactionSchema = z.object({
  network: z.enum(['BTC', 'ETH', 'BSC', 'TRX', 'TON', 'SOL']),
  token: z.string().optional(),
  amount: z.string().min(1, 'Amount is required'),
  amountUsd: z.number().optional(),
  customerPaysFee: z.boolean().optional(),
  merchantWalletAddress: z.string().min(1, 'Merchant wallet address is required')
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'MERCHANT') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createTransactionSchema.parse(body)

    // Get merchant ID from session
    const merchantId = session.user.merchantId
    if (!merchantId) {
      return NextResponse.json(
        { error: 'Merchant profile not found' },
        { status: 400 }
      )
    }

    // Validate merchant wallet address
    if (!walletService.validateAddress(validatedData.merchantWalletAddress, validatedData.network)) {
      return NextResponse.json(
        { error: `Invalid ${validatedData.network} address` },
        { status: 400 }
      )
    }

    // Create transaction
    const transaction = await transactionService.createTransaction({
      merchantId,
      network: validatedData.network,
      token: validatedData.token,
      amount: validatedData.amount,
      amountUsd: validatedData.amountUsd,
      customerPaysFee: validatedData.customerPaysFee,
      merchantWalletAddress: validatedData.merchantWalletAddress
    })

    return NextResponse.json({
      success: true,
      data: {
        transactionId: transaction.transactionId,
        tempWalletAddress: transaction.tempWalletAddress,
        amount: transaction.amount,
        feeAmount: transaction.feeAmount,
        totalAmount: transaction.totalAmount,
        expiresAt: transaction.expiresAt,
        network: transaction.network,
        token: transaction.token,
        qrCode: transaction.qrCode,
        networkDisplayName: walletService.getNetworkDisplayName(validatedData.network),
        networkSymbol: walletService.getNetworkSymbol(validatedData.network)
      }
    })

  } catch (error) {
    console.error('Error creating transaction:', error)

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
