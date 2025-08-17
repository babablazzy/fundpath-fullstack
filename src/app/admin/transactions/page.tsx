'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'

interface Transaction {
  id: string
  network: string
  token: string | null
  amount: string
  amountUsd: number | null
  status: string
  customerPaysFee: boolean
  feeAmount: string
  feeAmountUsd: number | null
  tempWalletAddress: string
  merchantWalletAddress: string
  confirmations: number
  requiredConfirmations: number
  incomingTxHash: string | null
  outgoingTxHash: string | null
  expiresAt: string
  paidAt: string | null
  forwardedAt: string | null
  retryCount: number
  createdAt: string
  updatedAt: string
  merchant: {
    id: string
    user: {
      name: string
      email: string
    }
    websiteUrl: string
  }
}

export default function AdminTransactionsPage() {
  const { data: session, status } = useSession()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    network: '',
    search: '',
    startDate: '',
    endDate: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  const ITEMS_PER_PAGE = 15

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      redirect('/auth/signin')
    }
    fetchTransactions()
  }, [session, status, currentPage, filters])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.network && { network: filters.network }),
        ...(filters.search && { search: filters.search }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      })
      const response = await fetch(`/api/admin/transactions?${params}`)
      const data = await response.json()
      setTransactions(data.transactions || data)
      setTotalPages(data.totalPages || Math.ceil((data.totalCount || data.length) / ITEMS_PER_PAGE))
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getNetworkIcon = (network: string) => {
    const icons: { [key: string]: string } = {
      BTC: '₿',
      ETH: 'Ξ',
      SOL: '◎',
      TON: '💎',
      USDT: '💵',
      USDC: '💵',
      TRX: '⚡',
      BSC: '🟡'
    }
    return icons[network] || '🔗'
  }

  const getNetworkName = (network: string) => {
    const names: { [key: string]: string } = {
      BTC: 'Bitcoin',
      ETH: 'Ethereum',
      SOL: 'Solana',
      TON: 'TON',
      USDT: 'Tether',
      USDC: 'USD Coin',
      TRX: 'Tron',
      BSC: 'BNB Smart Chain'
    }
    return names[network] || network
  }

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: string } = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-blue-100 text-blue-800',
      FORWARDING: 'bg-purple-100 text-purple-800',
      COMPLETED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      EXPIRED: 'bg-gray-100 text-gray-800'
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
  }

  const formatAmount = (amount: string, network: string, token: string | null) => {
    // This is a simplified version - in production you'd use proper decimal handling
    const numAmount = parseFloat(amount)
    if (token) {
      return `${numAmount.toFixed(2)} ${token}`
    }
    return `${numAmount.toFixed(8)} ${network}`
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Global Transactions</h1>
            <p className="text-gray-600 mt-2">Monitor all transactions across all merchants</p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-4">
            <button
              onClick={() => fetchTransactions()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
                <option value="FORWARDING">Forwarding</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Network</label>
              <select
                value={filters.network}
                onChange={(e) => setFilters({ ...filters, network: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Networks</option>
                <option value="BTC">Bitcoin</option>
                <option value="ETH">Ethereum</option>
                <option value="SOL">Solana</option>
                <option value="TON">TON</option>
                <option value="USDT">USDT</option>
                <option value="USDC">USDC</option>
                <option value="TRX">Tron</option>
                <option value="BSC">BSC</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ status: '', network: '', search: '', startDate: '', endDate: '' })}
                className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Transaction ID, merchant name, or wallet address"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Merchant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Network
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {transaction.id.slice(0, 8)}...
                      </div>
                      <div className="text-sm text-gray-500">
                        {transaction.tempWalletAddress.slice(0, 12)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {transaction.merchant.user.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {transaction.merchant.user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{getNetworkIcon(transaction.network)}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {getNetworkName(transaction.network)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {transaction.network}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatAmount(transaction.amount, transaction.network, transaction.token)}
                      </div>
                      {transaction.amountUsd && (
                        <div className="text-sm text-gray-500">
                          ${transaction.amountUsd.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(transaction.status)}`}>
                        {transaction.status}
                      </span>
                      {transaction.status === 'PENDING' && (
                        <div className="text-xs text-gray-500 mt-1">
                          {transaction.confirmations}/{transaction.requiredConfirmations} confirmations
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                      <div className="text-xs">
                        {new Date(transaction.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedTransaction(transaction)
                          setShowDetailsModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing page <span className="font-medium">{currentPage}</span> of{' '}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Transaction Details Modal */}
        {showDetailsModal && selectedTransaction && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Transaction Details</h3>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Transaction Information</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">ID:</span> {selectedTransaction.id}</p>
                      <p><span className="font-medium">Network:</span> {getNetworkName(selectedTransaction.network)} ({selectedTransaction.network})</p>
                      <p><span className="font-medium">Token:</span> {selectedTransaction.token || 'Native'}</p>
                      <p><span className="font-medium">Amount:</span> {formatAmount(selectedTransaction.amount, selectedTransaction.network, selectedTransaction.token)}</p>
                      <p><span className="font-medium">USD Amount:</span> ${selectedTransaction.amountUsd?.toFixed(2) || 'N/A'}</p>
                      <p><span className="font-medium">Status:</span> {selectedTransaction.status}</p>
                      <p><span className="font-medium">Customer Pays Fee:</span> {selectedTransaction.customerPaysFee ? 'Yes' : 'No'}</p>
                      <p><span className="font-medium">Fee Amount:</span> {formatAmount(selectedTransaction.feeAmount, selectedTransaction.network, selectedTransaction.token)}</p>
                      <p><span className="font-medium">Fee USD:</span> ${selectedTransaction.feeAmountUsd?.toFixed(2) || 'N/A'}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Addresses & Hashes</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Temp Wallet:</span> {selectedTransaction.tempWalletAddress}</p>
                      <p><span className="font-medium">Merchant Wallet:</span> {selectedTransaction.merchantWalletAddress}</p>
                      <p><span className="font-medium">Incoming Hash:</span> {selectedTransaction.incomingTxHash || 'N/A'}</p>
                      <p><span className="font-medium">Outgoing Hash:</span> {selectedTransaction.outgoingTxHash || 'N/A'}</p>
                      <p><span className="font-medium">Confirmations:</span> {selectedTransaction.confirmations}/{selectedTransaction.requiredConfirmations}</p>
                      <p><span className="font-medium">Retry Count:</span> {selectedTransaction.retryCount}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Merchant Information</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Name:</span> {selectedTransaction.merchant.user.name}</p>
                      <p><span className="font-medium">Email:</span> {selectedTransaction.merchant.user.email}</p>
                      <p><span className="font-medium">Website:</span> {selectedTransaction.merchant.websiteUrl}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Timestamps</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Created:</span> {new Date(selectedTransaction.createdAt).toLocaleString()}</p>
                      <p><span className="font-medium">Expires:</span> {new Date(selectedTransaction.expiresAt).toLocaleString()}</p>
                      <p><span className="font-medium">Paid:</span> {selectedTransaction.paidAt ? new Date(selectedTransaction.paidAt).toLocaleString() : 'N/A'}</p>
                      <p><span className="font-medium">Forwarded:</span> {selectedTransaction.forwardedAt ? new Date(selectedTransaction.forwardedAt).toLocaleString() : 'N/A'}</p>
                      <p><span className="font-medium">Updated:</span> {new Date(selectedTransaction.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
