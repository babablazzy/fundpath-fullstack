import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  businessName: z.string().min(1, 'Business name is required'),
  websiteUrl: z.string().url('Invalid website URL').optional(),
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
  webhookUrl: z.string().url('Invalid webhook URL').optional(),
  webhookEnabled: z.boolean().default(false),
  globalFeePayment: z.enum(['customer', 'merchant']).default('customer'),
  applyToAllChains: z.boolean().default(false),
  networks: z.array(z.object({
    network: z.string(),
    token: z.string(),
    payoutWallet: z.string().min(1, 'Payout wallet is required'),
    customerPaysFee: z.boolean()
  })).min(1, 'At least one network is required')
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: {
        merchantId: session.user.merchantId
      },
      include: {
        networkConfigs: true
      } as any,
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(apiKeys)
  } catch (error) {
    console.error('API Keys GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, businessName, websiteUrl, permissions, webhookUrl, webhookEnabled, globalFeePayment, applyToAllChains, networks } = createApiKeySchema.parse(body)

    // Generate API key and webhook secret
    const apiKey = `fp_${crypto.randomBytes(32).toString('hex')}`
    const webhookSecret = webhookEnabled ? crypto.randomBytes(32).toString('hex') : null

    // Create API key and update merchant website URL if provided
    const result = await prisma.$transaction(async (tx) => {
      // Update merchant's business name if not already set
      await (tx as any).merchant.update({
        where: { id: session.user.merchantId },
        data: { businessName }
      })

      // Create the API key
      const newApiKey = await (tx as any).apiKey.create({
        data: {
          merchantId: session.user.merchantId,
          name,
          businessName,
          key: apiKey,
          permissions,
          isActive: true,
          webhookUrl: webhookEnabled ? webhookUrl : null,
          webhookSecret,
          webhookEnabled,
          globalFeePayment,
          applyToAllChains
        }
      })

      // Create network configurations
      for (const networkConfig of networks) {
        // Use global fee payment preference if applyToAllChains is true
        const finalCustomerPaysFee = applyToAllChains 
          ? globalFeePayment === 'customer'
          : networkConfig.customerPaysFee

        await (tx as any).apiKeyNetworkConfig.create({
          data: {
            apiKeyId: newApiKey.id,
            network: networkConfig.network,
            token: networkConfig.token,
            payoutWallet: networkConfig.payoutWallet,
            customerPaysFee: finalCustomerPaysFee
          }
        })
      }

      // Update merchant website URL if provided
      if (websiteUrl) {
        await tx.merchant.update({
          where: { id: session.user.merchantId },
          data: { websiteUrl }
        })
      }

      return newApiKey
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('API Keys POST error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    )
  }
}
