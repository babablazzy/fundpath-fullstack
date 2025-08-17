import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const querySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('10'),
  status: z.string().optional(),
  search: z.string().optional(),
  turnover: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const { page, limit, status, search, turnover } = querySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status'),
      search: searchParams.get('search'),
      turnover: searchParams.get('turnover')
    })

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      user: {}
    }

    if (status === 'active') {
      where.user.isActive = true
      where.isApproved = true
    } else if (status === 'pending') {
      where.isApproved = false
    } else if (status === 'suspended') {
      where.user.isActive = false
    }

    if (turnover) {
      where.expectedTurnover = turnover
    }

    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { websiteUrl: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get merchants with counts
    const [merchants, totalCount] = await Promise.all([
      prisma.merchant.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
              emailVerified: true,
              createdAt: true
            }
          },
          _count: {
            select: {
              transactions: true,
              wallets: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.merchant.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      merchants,
      totalCount,
      totalPages,
      currentPage: page,
      limit
    })
  } catch (error) {
    console.error('Admin merchants GET error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch merchants' },
      { status: 500 }
    )
  }
}
