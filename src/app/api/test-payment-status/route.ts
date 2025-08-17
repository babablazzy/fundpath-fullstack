import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Create a mock payment status for testing
  const mockStatus = {
    status: 'PENDING',
    paid: false,
    confirmations: 0,
    paidAt: null
  }

  return NextResponse.json(mockStatus)
}

