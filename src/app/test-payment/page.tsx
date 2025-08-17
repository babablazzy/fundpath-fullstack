'use client'

import { useEffect, useState } from 'react'
import QRCode from 'react-qr-code'

interface Transaction {
  id: string
  amount: string
  network: string
  merchantWalletAddress: string
  platformWalletAddress: string
  status: string
  expiresAt: string
  createdAt: string
  merchant: {
    name: string
    websiteUrl: string
  }
}

interface PaymentStatus {
  status: string
  paid: boolean
  confirmations: number
  paidAt?: string
}

export default function TestPaymentPage() {
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)

  useEffect(() => {
    fetchTransaction()
    const interval = setInterval(checkPaymentStatus, 5000) // Check every 5 seconds
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (transaction?.expiresAt) {
      const timer = setInterval(() => {
        const now = new Date().getTime()
        const expiry = new Date(transaction.expiresAt).getTime()
        const remaining = Math.max(0, expiry - now)
        setTimeLeft(remaining)
        
        if (remaining === 0) {
          clearInterval(timer)
        }
      }, 1000)
      
      return () => clearInterval(timer)
    }
  }, [transaction])

  const fetchTransaction = async () => {
    try {
      const response = await fetch('/api/test-payment-page')
      if (!response.ok) {
        throw new Error('Failed to load test transaction')
      }
      const data = await response.json()
      setTransaction(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transaction')
    } finally {
      setLoading(false)
    }
  }

  const checkPaymentStatus = async () => {
    if (!transaction || paymentStatus?.paid) return
    
    try {
      const response = await fetch('/api/test-payment-status')
      if (response.ok) {
        const status = await response.json()
        setPaymentStatus(status)
      }
    } catch (err) {
      console.error('Failed to check payment status:', err)
    }
  }

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-600'
      case 'PAID': return 'text-green-600'
      case 'EXPIRED': return 'text-red-600'
      case 'FAILED': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Transaction Not Found</h1>
          <p className="text-gray-600">The payment link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
          <h1 className="text-xl font-bold text-white">Crypto Payment</h1>
          <p className="text-blue-100 text-sm">{transaction.merchant.name}</p>
        </div>

        {/* Payment Details */}
        <div className="p-6">
          {/* Amount */}
          <div className="text-center mb-6">
            <div className="text-5xl font-bold text-gray-900 mb-2">
              {transaction.amount}
            </div>
            <div className="text-2xl font-semibold text-blue-600 mb-2">
              {transaction.network.toUpperCase()}
            </div>
            <p className="text-gray-600 text-sm">Amount to pay</p>
            <button
              onClick={() => navigator.clipboard.writeText(`${transaction.amount} ${transaction.network.toUpperCase()}`)}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Copy amount
            </button>
          </div>

          {/* Status */}
          <div className="mb-6">
            <div className={`text-center text-lg font-semibold ${getStatusColor(transaction.status)}`}>
              {transaction.status}
            </div>
            {paymentStatus?.paid && (
              <div className="text-center text-green-600 text-sm mt-1">
                {paymentStatus.confirmations} confirmations
              </div>
            )}
          </div>

          {/* Timer */}
          {timeLeft > 0 && (
            <div className="mb-6 text-center">
              <div className="text-sm text-gray-600">Time remaining</div>
              <div className="text-2xl font-mono text-red-600">{formatTime(timeLeft)}</div>
            </div>
          )}

          {/* QR Code */}
          {transaction.status === 'PENDING' && (
            <div className="mb-6 text-center">
              <div className="bg-gray-100 p-4 rounded-lg inline-block">
                <QRCode 
                  value={transaction.platformWalletAddress}
                  size={200}
                  level="M"
                />
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Scan to pay with {transaction.network.toUpperCase()}
              </p>
            </div>
          )}

          {/* Wallet Address */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send payment to:
            </label>
            <div className="bg-gray-50 p-4 rounded-lg border-2 border-blue-200">
              <code className="text-sm break-all text-gray-800 font-mono">
                {transaction.platformWalletAddress}
              </code>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(transaction.platformWalletAddress)}
              className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              📋 Copy Wallet Address
            </button>
          </div>

          {/* Network Info */}
          <div className="mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Network:</span>
              <span className="font-medium">{transaction.network.toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Created:</span>
              <span className="font-medium">
                {new Date(transaction.createdAt).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Payment Instructions:</h3>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Send exactly {transaction.amount} {transaction.network.toUpperCase()}</li>
              <li>2. Use the {transaction.network.toUpperCase()} network</li>
              <li>3. Send to the address above</li>
              <li>4. Wait for confirmation</li>
            </ol>
          </div>

          {/* Test Notice */}
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Test Mode:</strong> This is a demo payment page. No real transactions will be processed.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 text-center">
          <p className="text-xs text-gray-500">
            Powered by FundPath • Secure crypto payments
          </p>
        </div>
      </div>
    </div>
  )
}

