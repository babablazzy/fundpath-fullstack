import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateWalletSchema = z.object({
  address: z.string().min(1)
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { address } = updateWalletSchema.parse(body)

    // Verify the wallet belongs to the merchant
    const existingWallet = await prisma.wallet.findFirst({
      where: {
        id,
        merchantId: session.user.merchantId
      }
    })

    if (!existingWallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    const wallet = await prisma.wallet.update({
      where: { id },
      data: { address }
    })

    return NextResponse.json(wallet)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating wallet:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the wallet belongs to the merchant
    const existingWallet = await prisma.wallet.findFirst({
      where: {
        id,
        merchantId: session.user.merchantId
      }
    })

    if (!existingWallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    // Check if wallet is being used in any active transactions
    const activeTransactions = await prisma.transaction.findFirst({
      where: {
        merchantWalletAddress: existingWallet.address,
        status: {
          in: ['PENDING', 'PAID', 'FORWARDING']
        }
      }
    })

    if (activeTransactions) {
      return NextResponse.json(
        { error: 'Cannot delete wallet with active transactions' },
        { status: 400 }
      )
    }

    await prisma.wallet.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Wallet deleted successfully' })
  } catch (error) {
    console.error('Error deleting wallet:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
