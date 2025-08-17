import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const wallets = await prisma.wallet.findMany({
      where: {
        merchantId: session.user.merchantId,
        isActive: true
      },
      select: {
        network: true,
        address: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(wallets)
  } catch (error) {
    console.error('Error fetching wallets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

const createWalletSchema = z.object({
  network: z.string().min(1),
  address: z.string().min(1)
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { network, address } = createWalletSchema.parse(body)

    // Check if wallet already exists for this network
    const existingWallet = await prisma.wallet.findFirst({
      where: {
        merchantId: session.user.merchantId,
        network: network.toUpperCase(),
        isActive: true
      }
    })

    if (existingWallet) {
      return NextResponse.json(
        { error: 'Wallet already exists for this network' },
        { status: 400 }
      )
    }

    const wallet = await prisma.wallet.create({
      data: {
        merchantId: session.user.merchantId,
        network: network.toUpperCase(),
        address,
        isActive: true
      }
    })

    return NextResponse.json(wallet)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating wallet:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
