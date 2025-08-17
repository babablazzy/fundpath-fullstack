import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSettingsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  websiteUrl: z.string().min(1, 'Website URL is required').refine(
    (url) => {
      if (!url) return false
      try {
        new URL(url)
        return true
      } catch {
        return false
      }
    },
    'Website URL must be a valid URL'
  ),
  expectedTurnover: z.enum(['below_10k', '10k_50k', '50k_100k', 'above_100k'])
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

    let merchantId = session.user.merchantId

    // If no merchant profile exists, create one
    if (!merchantId) {
      const newMerchant = await prisma.merchant.create({
        data: {
          userId: session.user.id,
          websiteUrl: '',
          expectedTurnover: 'below_10k',
          isApproved: false
        }
      })
      merchantId = newMerchant.id
    }

    // Get merchant and user data
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        networkPreferences: {
          take: 1,
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!merchant) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      )
    }

    // Return settings
    return NextResponse.json({
      name: merchant.user.name,
      email: merchant.user.email,
      websiteUrl: merchant.websiteUrl || '',
      expectedTurnover: merchant.expectedTurnover || 'below_10k'
    })

  } catch (error) {
    console.error('Error fetching merchant settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'MERCHANT') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const validatedData = updateSettingsSchema.parse(body)

    // Update merchant and user data
    await prisma.$transaction(async (tx) => {
      // Update user
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          name: validatedData.name,
          email: session.user.email // Keep email as it's readonly
        }
      })

      // Get or create merchant profile
      let merchantId = session.user.merchantId
      if (!merchantId) {
        const newMerchant = await tx.merchant.create({
          data: {
            userId: session.user.id,
            websiteUrl: validatedData.websiteUrl,
            expectedTurnover: validatedData.expectedTurnover,
            isApproved: false
          }
        })
        merchantId = newMerchant.id
      } else {
        // Update existing merchant
        await tx.merchant.update({
          where: { id: merchantId },
          data: {
            websiteUrl: validatedData.websiteUrl,
            expectedTurnover: validatedData.expectedTurnover
          }
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully'
    })

  } catch (error) {
    console.error('Error updating merchant settings:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
