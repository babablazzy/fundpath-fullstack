'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Footer from '@/components/Footer'

interface NetworkConfig {
  id: string
  network: string
  token: string
  payoutWallet: string
  customerPaysFee: boolean
  feeRate: number
  isEnabled: boolean
}

interface ApiKey {
  id: string
  name: string
  key: string
  isActive: boolean
  createdAt: string
  lastUsed?: string
  permissions: string[]
  webhookUrl?: string
  webhookEnabled: boolean
  networkConfigs: NetworkConfig[]
}

const NETWORK_NAMES: { [key: string]: string } = {
  'BTC': 'Bitcoin',
  'ETH': 'Ethereum',
  'BSC': 'Binance Smart Chain',
  'TRX': 'Tron',
  'SOL': 'Solana',
  'TON': 'Toncoin'
}

const TOKEN_NAMES: { [key: string]: string } = {
  'BTC': 'BTC',
  'ETH': 'ETH',
  'BNB': 'BNB',
  'TRX': 'TRX',
  'SOL': 'SOL',
  'TON': 'TON',
  'USDT': 'USDT'
}

const NETWORK_ICONS: { [key: string]: { icon: string, color: string } } = {
  'BTC': { icon: 'fa-bitcoin', color: 'text-orange-500' },
  'ETH': { icon: 'fa-ethereum', color: 'text-blue-500' },
  'BSC': { icon: 'fa-coins', color: 'text-yellow-500' },
  'TRX': { icon: 'fa-bolt', color: 'text-red-500' },
  'SOL': { icon: 'fa-circle', color: 'text-purple-500' },
  'TON': { icon: 'fa-gem', color: 'text-cyan-500' },
  'USDT': { icon: 'fa-dollar-sign', color: 'text-green-500' }
}

export default function WalletsPage() {
  const { data: session, status } = useSession()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.merchantId) {
      redirect('/auth/signin')
    }
    fetchApiKeys()
  }, [session, status])

  const fetchApiKeys = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/api-keys')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('API Keys Error:', response.status, errorData)
        setApiKeys([])
        return
      }
      
      const data = await response.json()
      setApiKeys(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching API keys:', error)
      setApiKeys([])
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(text)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`
  }

  const getNetworkDisplayName = (network: string, token: string) => {
    const networkName = NETWORK_NAMES[network] || network
    const tokenName = TOKEN_NAMES[token] || token
    
    if (token === network) {
      return `${networkName} (${tokenName})`
    }
    return `${tokenName} on ${networkName}`
  }

  const getNetworkIcon = (network: string, token: string) => {
    const iconKey = token === network ? network : token
    return NETWORK_ICONS[iconKey] || { icon: 'fa-link', color: 'text-gray-500' }
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/' })
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">Loading wallets...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col">
      {/* Enhanced Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Wallet Management</h1>
                  <p className="text-sm text-gray-600">Manage your API keys and payout wallets</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-3">
                <Link
                  href="/dashboard"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 hover:bg-gray-100"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/api"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 hover:bg-gray-100"
                >
                  API Keys
                </Link>
                <Link
                  href="/dashboard/transactions"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 hover:bg-gray-100"
                >
                  Transactions
                </Link>
              </div>
              <div className="flex items-center space-x-3">
                <Link
                  href="/dashboard/api/create"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create API Key
                </Link>
                <Link
                  href="/dashboard"
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Dashboard
                </Link>
                <div className="relative group">
                  <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Account
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-2">
                      <Link
                        href="/dashboard/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                      >
                        Settings
                      </Link>
                      <Link
                        href="/dashboard/analytics"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                      >
                        Analytics
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 mb-8 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold">Wallet Management</h2>
              <p className="text-blue-100">Configure payout wallets and manage your API key settings</p>
            </div>
          </div>
        </div>

        {apiKeys.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No API keys found</h3>
            <p className="text-gray-600 mb-6">Get started by creating your first API key with wallet configurations.</p>
            <Link
              href="/dashboard/api/create"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create API Key
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.isArray(apiKeys) && apiKeys.map((apiKey) => (
              <div key={apiKey.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
                {/* API Key Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{apiKey.name}</h3>
                      <p className="text-sm text-gray-600">Created {new Date(apiKey.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      apiKey.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      <div className={`w-2 h-2 rounded-full mr-2 ${apiKey.isActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      {apiKey.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <Link
                      href={`/dashboard/api/${apiKey.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors duration-200"
                    >
                      Manage
                    </Link>
                  </div>
                </div>

                {/* API Key Display */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={maskApiKey(apiKey.key)}
                      readOnly
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                    />
                    <button
                      onClick={() => copyToClipboard(apiKey.key)}
                      className="px-4 py-3 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200 flex items-center"
                    >
                      {copiedKey === apiKey.key ? (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy Full Key
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Network Configurations */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Network Configurations
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {apiKey.networkConfigs?.map((config) => {
                      const networkIcon = getNetworkIcon(config.network, config.token)
                      return (
                        <div key={config.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center shadow-sm ${networkIcon.color}`}>
                                <i className={`fas ${networkIcon.icon} text-lg`}></i>
                              </div>
                              <div>
                                <h5 className="font-medium text-gray-900">
                                  {getNetworkDisplayName(config.network, config.token)}
                                </h5>
                              </div>
                            </div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              config.isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${config.isEnabled ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                              {config.isEnabled ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          
                          <div className="space-y-3 text-sm">
                            <div>
                              <span className="text-gray-600 font-medium">Payout Wallet:</span>
                              <div className="font-mono text-xs bg-gray-100 p-2 rounded-lg mt-1 break-all border">
                                {config.payoutWallet}
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 font-medium">Fee Payment:</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                config.customerPaysFee ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                              }`}>
                                {config.customerPaysFee ? 'Customer' : 'Merchant'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Webhook Status */}
                {apiKey.webhookEnabled && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <div>
                        <span className="text-sm font-medium text-blue-800">Webhooks enabled</span>
                        <p className="text-xs text-blue-600 mt-1">{apiKey.webhookUrl}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Last Used */}
                {apiKey.lastUsed && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Last used: {new Date(apiKey.lastUsed).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  )
}
