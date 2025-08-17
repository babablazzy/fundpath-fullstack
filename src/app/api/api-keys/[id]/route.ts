import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    // Check if the API key belongs to the merchant
    const existingApiKey = await prisma.apiKey.findFirst({
      where: {
        id,
        merchantId: session.user.merchantId
      }
    })

    if (!existingApiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    // Delete the API key
    await prisma.apiKey.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'API key revoked successfully' })
  } catch (error) {
    console.error('API Key DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to revoke API key' },
      { status: 500 }
    )
  }
}
