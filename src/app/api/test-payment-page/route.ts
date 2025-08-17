import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Create a mock transaction for testing
  const mockTransaction = {
    id: 'test-transaction-123',
    amount: '0.001',
    network: 'bitcoin',
    merchantWalletAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    platformWalletAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
    createdAt: new Date().toISOString(),
    merchant: {
      name: 'Crypto Store Demo',
      websiteUrl: 'https://example.com'
    }
  }

  return NextResponse.json(mockTransaction)
}

