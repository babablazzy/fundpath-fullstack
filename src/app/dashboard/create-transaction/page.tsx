'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Network {
  id: string
  name: string
  symbol: string
  icon: string
  tokens: string[]
  minAmount: number
  maxAmount: number
  feeRate: number
}

const NETWORKS: Network[] = [
  {
    id: 'BTC',
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: '₿',
    tokens: [],
    minAmount: 0.0001,
    maxAmount: 10,
    feeRate: 0.005
  },
  {
    id: 'ETH',
    name: 'Ethereum',
    symbol: 'ETH',
    icon: 'Ξ',
    tokens: ['USDT', 'USDC', 'DAI'],
    minAmount: 0.001,
    maxAmount: 100,
    feeRate: 0.005
  },
  {
    id: 'SOL',
    name: 'Solana',
    symbol: 'SOL',
    icon: '◎',
    tokens: ['USDT', 'USDC'],
    minAmount: 0.01,
    maxAmount: 1000,
    feeRate: 0.005
  },
  {
    id: 'TON',
    name: 'TON',
    symbol: 'TON',
    icon: '💎',
    tokens: ['USDT'],
    minAmount: 0.1,
    maxAmount: 10000,
    feeRate: 0.005
  },
  {
    id: 'BSC',
    name: 'Binance Smart Chain',
    symbol: 'BNB',
    icon: '🔶',
    tokens: ['USDT', 'USDC', 'BUSD'],
    minAmount: 0.001,
    maxAmount: 1000,
    feeRate: 0.005
  },
  {
    id: 'TRX',
    name: 'Tron',
    symbol: 'TRX',
    icon: '⚡',
    tokens: ['USDT'],
    minAmount: 1,
    maxAmount: 100000,
    feeRate: 0.005
  }
]

export default function CreateTransaction() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null)
  const [selectedToken, setSelectedToken] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [amountUsd, setAmountUsd] = useState('')
  const [customerPaysFee, setCustomerPaysFee] = useState(true)
  const [merchantWalletAddress, setMerchantWalletAddress] = useState('')
  const [wallets, setWallets] = useState<{ network: string; address: string }[]>([])
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session?.user?.merchantId) {
      redirect('/auth/signin')
    }

    fetchWallets()
  }, [session, status])

  const fetchWallets = async () => {
    try {
      const response = await fetch('/api/wallets')
      const data = await response.json()
      setWallets(data)
    } catch (error) {
      console.error('Error fetching wallets:', error)
    }
  }

  const handleNetworkSelect = (network: Network) => {
    setSelectedNetwork(network)
    setSelectedToken('')
    setErrors({})
    
    // Set default wallet for this network
    const defaultWallet = wallets.find(w => w.network === network.id)
    if (defaultWallet) {
      setMerchantWalletAddress(defaultWallet.address)
    }
  }

  const handleAmountChange = (value: string) => {
    setAmount(value)
    // Simulate USD conversion (in real app, use actual exchange rates)
    const numValue = parseFloat(value) || 0
    const usdValue = numValue * 50000 // Simplified conversion
    setAmountUsd(usdValue.toFixed(2))
    setErrors({})
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!selectedNetwork) {
      newErrors.network = 'Please select a network'
    }

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount'
    } else if (selectedNetwork) {
      const numAmount = parseFloat(amount)
      if (numAmount < selectedNetwork.minAmount) {
        newErrors.amount = `Minimum amount is ${selectedNetwork.minAmount} ${selectedNetwork.symbol}`
      } else if (numAmount > selectedNetwork.maxAmount) {
        newErrors.amount = `Maximum amount is ${selectedNetwork.maxAmount} ${selectedNetwork.symbol}`
      }
    }

    if (!merchantWalletAddress) {
      newErrors.wallet = 'Please enter a wallet address'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    
    try {
      const response = await fetch('/api/transactions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          network: selectedNetwork?.id.toLowerCase(),
          token: selectedToken || undefined,
          amount: amount,
          amountUsd: parseFloat(amountUsd),
          customerPaysFee,
          merchantWalletAddress
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create transaction')
      }

      const transaction = await response.json()
      router.push(`/dashboard/transactions/${transaction.id}`)
    } catch (error) {
      console.error('Error creating transaction:', error)
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create transaction' })
    } finally {
      setLoading(false)
    }
  }

  const calculateFee = () => {
    if (!amount || !selectedNetwork) return 0
    const numAmount = parseFloat(amount)
    return numAmount * selectedNetwork.feeRate
  }

  const calculateTotal = () => {
    if (!amount) return 0
    const numAmount = parseFloat(amount)
    const fee = calculateFee()
    return customerPaysFee ? numAmount + fee : numAmount
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create Transaction</h1>
              <p className="mt-1 text-gray-600">Generate a new payment request</p>
            </div>
            <Link
              href="/dashboard"
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Network Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Select Network
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {NETWORKS.map((network) => (
                  <button
                    key={network.id}
                    type="button"
                    onClick={() => handleNetworkSelect(network)}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      selectedNetwork?.id === network.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">{network.icon}</div>
                      <div className="font-medium text-gray-900">{network.name}</div>
                      <div className="text-sm text-gray-500">{network.symbol}</div>
                    </div>
                  </button>
                ))}
              </div>
              {errors.network && (
                <p className="mt-2 text-sm text-red-600">{errors.network}</p>
              )}
            </div>

            {/* Token Selection (if applicable) */}
            {selectedNetwork && selectedNetwork.tokens.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Token (Optional)
                </label>
                <select
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{selectedNetwork.symbol} (Native)</option>
                  {selectedNetwork.tokens.map((token) => (
                    <option key={token} value={token}>
                      {token}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder={`0.00 ${selectedNetwork?.symbol || ''}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {selectedNetwork && (
                  <div className="absolute right-3 top-2 text-sm text-gray-500">
                    {selectedNetwork.icon}
                  </div>
                )}
              </div>
              {amountUsd && (
                <p className="mt-1 text-sm text-gray-500">≈ ${amountUsd} USD</p>
              )}
              {errors.amount && (
                <p className="mt-2 text-sm text-red-600">{errors.amount}</p>
              )}
            </div>

            {/* Fee Payment Option */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fee Payment
              </label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={customerPaysFee}
                    onChange={() => setCustomerPaysFee(true)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    Customer pays fee (Recommended)
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!customerPaysFee}
                    onChange={() => setCustomerPaysFee(false)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    Merchant pays fee
                  </span>
                </label>
              </div>
            </div>

            {/* Merchant Wallet Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Wallet Address ({selectedNetwork?.symbol || 'Network'})
              </label>
              <input
                type="text"
                value={merchantWalletAddress}
                onChange={(e) => setMerchantWalletAddress(e.target.value)}
                placeholder="Enter your wallet address"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.wallet && (
                <p className="mt-2 text-sm text-red-600">{errors.wallet}</p>
              )}
            </div>

            {/* Transaction Summary */}
            {amount && selectedNetwork && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">
                      {amount} {selectedNetwork.symbol}
                      {selectedToken && ` (${selectedToken})`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fee ({selectedNetwork.feeRate * 100}%):</span>
                    <span className="font-medium">
                      {calculateFee().toFixed(6)} {selectedNetwork.symbol}
                    </span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="text-gray-900 font-medium">
                        {customerPaysFee ? 'Customer Pays:' : 'You Receive:'}
                      </span>
                      <span className="text-gray-900 font-bold">
                        {calculateTotal().toFixed(6)} {selectedNetwork.symbol}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Link
                href="/dashboard"
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || !selectedNetwork || !amount}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create Transaction'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
