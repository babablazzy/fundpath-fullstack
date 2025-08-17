'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'

interface Merchant {
  id: string
  user: {
    id: string
    name: string
    email: string
    isActive: boolean
    emailVerified: string | null
    createdAt: string
  }
  websiteUrl: string
  expectedTurnover: string
  isApproved: boolean
  createdAt: string
  updatedAt: string
  _count: {
    transactions: number
    wallets: number
  }
}

export default function AdminMerchantsPage() {
  const { data: session, status } = useSession()
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    turnover: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      redirect('/auth/signin')
    }
    fetchMerchants()
  }, [session, status, currentPage, filters])

  const fetchMerchants = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
        ...(filters.turnover && { turnover: filters.turnover })
      })
      const response = await fetch(`/api/admin/merchants?${params}`)
      const data = await response.json()
      setMerchants(data.merchants || data)
      setTotalPages(data.totalPages || Math.ceil((data.totalCount || data.length) / ITEMS_PER_PAGE))
    } catch (error) {
      console.error('Error fetching merchants:', error)
    } finally {
      setLoading(false)
    }
  }

  const approveMerchant = async (merchantId: string) => {
    try {
      const response = await fetch(`/api/admin/merchants/${merchantId}/approve`, {
        method: 'POST'
      })
      if (response.ok) {
        setMerchants(merchants.map(m => 
          m.id === merchantId ? { ...m, isApproved: true } : m
        ))
      }
    } catch (error) {
      console.error('Error approving merchant:', error)
    }
  }

  const toggleMerchantStatus = async (merchantId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/merchants/${merchantId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      })
      if (response.ok) {
        setMerchants(merchants.map(m => 
          m.id === merchantId ? { ...m, user: { ...m.user, isActive: !isActive } } : m
        ))
      }
    } catch (error) {
      console.error('Error toggling merchant status:', error)
    }
  }

  const getTurnoverLabel = (turnover: string) => {
    const labels: { [key: string]: string } = {
      below_10k: 'Below $10K',
      '10k_50k': '$10K - $50K',
      '50k_100k': '$50K - $100K',
      above_100k: 'Above $100K'
    }
    return labels[turnover] || turnover
  }

  const getStatusBadge = (merchant: Merchant) => {
    if (!merchant.user.isActive) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Suspended</span>
    }
    if (!merchant.isApproved) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
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
            <h1 className="text-3xl font-bold text-gray-900">Merchant Management</h1>
            <p className="text-gray-600 mt-2">Manage merchant accounts and approvals</p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-4">
            <button
              onClick={() => fetchMerchants()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Turnover</label>
              <select
                value={filters.turnover}
                onChange={(e) => setFilters({ ...filters, turnover: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Turnover</option>
                <option value="below_10k">Below $10K</option>
                <option value="10k_50k">$10K - $50K</option>
                <option value="50k_100k">$50K - $100K</option>
                <option value="above_100k">Above $100K</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Name, email, or website"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ status: '', search: '', turnover: '' })}
                className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Merchants Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Merchant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Turnover
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transactions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {merchants.map((merchant) => (
                  <tr key={merchant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {merchant.user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {merchant.user.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {merchant.user.email}
                          </div>
                          <div className="text-sm text-gray-500">
                            {merchant.websiteUrl}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(merchant)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getTurnoverLabel(merchant.expectedTurnover)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {merchant._count.transactions} transactions
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(merchant.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedMerchant(merchant)
                            setShowDetailsModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </button>
                        {!merchant.isApproved && (
                          <button
                            onClick={() => approveMerchant(merchant.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => toggleMerchantStatus(merchant.id, merchant.user.isActive)}
                          className={`${
                            merchant.user.isActive 
                              ? 'text-red-600 hover:text-red-900' 
                              : 'text-green-600 hover:text-green-900'
                          }`}
                        >
                          {merchant.user.isActive ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
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

        {/* Merchant Details Modal */}
        {showDetailsModal && selectedMerchant && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Merchant Details</h3>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Basic Information</h4>
                    <div className="mt-2 space-y-2">
                      <p><span className="font-medium">Name:</span> {selectedMerchant.user.name}</p>
                      <p><span className="font-medium">Email:</span> {selectedMerchant.user.email}</p>
                      <p><span className="font-medium">Website:</span> {selectedMerchant.websiteUrl}</p>
                      <p><span className="font-medium">Expected Turnover:</span> {getTurnoverLabel(selectedMerchant.expectedTurnover)}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Account Status</h4>
                    <div className="mt-2 space-y-2">
                      <p><span className="font-medium">Email Verified:</span> {selectedMerchant.user.emailVerified ? 'Yes' : 'No'}</p>
                      <p><span className="font-medium">Account Active:</span> {selectedMerchant.user.isActive ? 'Yes' : 'No'}</p>
                      <p><span className="font-medium">Approved:</span> {selectedMerchant.isApproved ? 'Yes' : 'No'}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Activity</h4>
                    <div className="mt-2 space-y-2">
                      <p><span className="font-medium">Total Transactions:</span> {selectedMerchant._count.transactions}</p>
                      <p><span className="font-medium">Wallets:</span> {selectedMerchant._count.wallets}</p>
                      <p><span className="font-medium">Joined:</span> {new Date(selectedMerchant.createdAt).toLocaleString()}</p>
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
