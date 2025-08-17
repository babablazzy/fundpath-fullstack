'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Footer from '@/components/Footer'

interface NetworkConfig {
  network: string
  token: string
  payoutWallet: string
  customerPaysFee: boolean
}

interface ApiKeyForm {
  name: string
  businessName: string
  websiteUrl: string
  networks: NetworkConfig[]
  globalFeePayment: 'customer' | 'merchant'
  applyToAllChains: boolean
}

const SUPPORTED_NETWORKS = [
  { network: 'BTC', token: 'BTC', name: 'Bitcoin', symbol: 'BTC' },
  { network: 'ETH', token: 'ETH', name: 'Ethereum', symbol: 'ETH' },
  { network: 'BSC', token: 'BNB', name: 'Binance Smart Chain', symbol: 'BNB' },
  { network: 'TRX', token: 'TRX', name: 'Tron', symbol: 'TRX' },
  { network: 'SOL', token: 'SOL', name: 'Solana', symbol: 'SOL' },
  { network: 'TON', token: 'TON', name: 'Toncoin', symbol: 'TON' },
  { network: 'ETH', token: 'USDT', name: 'USDT (Ethereum)', symbol: 'USDT' },
  { network: 'BSC', token: 'USDT', name: 'USDT (BSC)', symbol: 'USDT' },
  { network: 'TRX', token: 'USDT', name: 'USDT (Tron)', symbol: 'USDT' },
]

export default function CreateApiKey() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<ApiKeyForm>({
    name: '',
    businessName: '',
    websiteUrl: '',
    networks: [],
    globalFeePayment: 'customer',
    applyToAllChains: false
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [webhookEnabled, setWebhookEnabled] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.merchantId) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  const handleInputChange = (field: keyof ApiKeyForm, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const toggleNetwork = (network: string, token: string) => {
    const existingNetwork = form.networks.find(n => n.network === network && n.token === token)
    
    if (existingNetwork) {
      setForm(prev => ({
        ...prev,
        networks: prev.networks.filter(n => !(n.network === network && n.token === token))
      }))
    } else {
      const newNetwork: NetworkConfig = {
        network,
        token,
        payoutWallet: '',
        customerPaysFee: form.applyToAllChains ? form.globalFeePayment === 'customer' : form.globalFeePayment === 'customer'
      }
      setForm(prev => ({ ...prev, networks: [...prev.networks, newNetwork] }))
    }
  }

  const updateNetworkConfig = (network: string, token: string, field: keyof NetworkConfig, value: any) => {
    setForm(prev => ({
      ...prev,
      networks: prev.networks.map(n => 
        n.network === network && n.token === token 
          ? { ...n, [field]: value }
          : n
      )
    }))
    setErrors({})
  }

  const isNetworkSelected = (network: string, token: string) => {
    return form.networks.some(n => n.network === network && n.token === token)
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!form.name.trim()) {
      newErrors.name = 'API key name is required'
    }

    if (!form.businessName.trim()) {
      newErrors.businessName = 'Business name is required'
    }

    if (!form.websiteUrl.trim()) {
      newErrors.websiteUrl = 'Website URL is required'
    } else if (!/^https?:\/\/.+/.test(form.websiteUrl)) {
      newErrors.websiteUrl = 'Website URL must start with http:// or https://'
    }

    if (form.networks.length === 0) {
      newErrors.networks = 'Please select at least one network'
    }

    // Validate each selected network
    form.networks.forEach((network, index) => {
      if (!network.payoutWallet.trim()) {
        newErrors[`payoutWallet_${index}`] = 'Payout wallet address is required'
      }
    })

    if (webhookEnabled && !webhookUrl.trim()) {
      newErrors.webhookUrl = 'Webhook URL is required when webhooks are enabled'
    } else if (webhookEnabled && !/^https?:\/\/.+/.test(webhookUrl)) {
      newErrors.webhookUrl = 'Webhook URL must start with http:// or https://'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          businessName: form.businessName,
          websiteUrl: form.websiteUrl,
          permissions: ['transactions:create', 'transactions:read'],
          webhookUrl,
          webhookEnabled,
          networks: form.networks,
          globalFeePayment: form.globalFeePayment,
          applyToAllChains: form.applyToAllChains
        })
      })

      if (response.ok) {
        router.push('/dashboard/api?created=true')
      } else {
        const errorData = await response.json()
        setErrors({ submit: errorData.error || 'Failed to create API key' })
      }
    } catch (error) {
      console.error('Error creating API key:', error)
      setErrors({ submit: 'Failed to create API key' })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <div className="text-2xl font-semibold text-gray-700 mb-2">Loading...</div>
          <div className="text-gray-500">Please wait while we prepare the form</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-gray-700 bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col">
      {/* Enhanced Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Create API Key</h1>
                  <p className="text-sm text-gray-600">Configure your API key with supported networks and settings</p>
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
              </div>
              
              <div className="flex items-center space-x-3">
                <Link
                  href="/dashboard/api"
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to API Keys
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Create New API Key</h2>
              <p className="text-blue-100">Configure your API key with supported networks, fee settings, and webhook configuration</p>
            </div>
            <div className="hidden md:block">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    placeholder="e.g., Production API Key"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={form.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    placeholder="Your Business Name"
                  />
                  {errors.businessName && (
                    <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={form.websiteUrl}
                    onChange={(e) => handleInputChange('websiteUrl', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    placeholder="https://your-website.com"
                  />
                  {errors.websiteUrl && (
                    <p className="mt-1 text-sm text-red-600">{errors.websiteUrl}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Global Fee Payment Preference */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                Global Fee Payment Preference
              </h2>
              <p className="text-gray-600 mb-4">Choose how fees should be paid for all networks by default.</p>
              <div className="space-y-3">
                <label className="flex items-center p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                  <input
                    type="radio"
                    checked={form.globalFeePayment === 'customer'}
                    onChange={() => handleInputChange('globalFeePayment', 'customer')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-700">Customer pays fee</span>
                    <p className="text-xs text-gray-500">Recommended for most use cases</p>
                  </div>
                </label>
                <label className="flex items-center p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                  <input
                    type="radio"
                    checked={form.globalFeePayment === 'merchant'}
                    onChange={() => handleInputChange('globalFeePayment', 'merchant')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-700">Fee deducted from payout</span>
                    <p className="text-xs text-gray-500">Merchant absorbs the transaction fee</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Apply To All Chains */}
            <div className="bg-blue-50 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Apply To All Chains
              </h2>
              <p className="text-gray-600 mb-4">
                If enabled, this API key will apply the selected global fee payment preference to all supported networks.
                Otherwise, you can configure individual networks.
              </p>
              <div className="space-y-3">
                <label className="flex items-center p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                  <input
                    type="checkbox"
                    checked={form.applyToAllChains}
                    onChange={(e) => handleInputChange('applyToAllChains', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-900">Apply Global Fee Preference to All Chains</span>
                    <p className="text-xs text-gray-500">Simplifies configuration for consistent fee handling</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Network Selection */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Supported Networks
              </h2>
              <p className="text-gray-600 mb-6">Select the networks you want to support with this API key</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {SUPPORTED_NETWORKS.map((network) => (
                  <div
                    key={`${network.network}_${network.token}`}
                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                      isNetworkSelected(network.network, network.token)
                        ? 'border-blue-500 bg-blue-50 shadow-md transform scale-105'
                        : 'border-gray-200 hover:border-blue-300 hover:shadow-md hover:bg-blue-25'
                    }`}
                    onClick={() => toggleNetwork(network.network, network.token)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center shadow-sm transition-all duration-200">
                          <div className="text-lg font-bold text-gray-700">{network.symbol}</div>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{network.name}</h3>
                          <p className="text-sm text-gray-600">{network.symbol}</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 transition-colors duration-200 ${
                        isNetworkSelected(network.network, network.token)
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {isNetworkSelected(network.network, network.token) && (
                          <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {errors.networks && (
                <p className="mt-2 text-sm text-red-600">{errors.networks}</p>
              )}
            </div>

            {/* Network Configuration */}
            {form.networks.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Network Configuration
                </h2>
                <div className="space-y-6">
                  {form.networks.map((network, index) => {
                    const networkInfo = SUPPORTED_NETWORKS.find(
                      n => n.network === network.network && n.token === network.token
                    )
                    
                    return (
                      <div key={`${network.network}_${network.token}`} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-gray-50">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200">
                              <div className="text-xl font-bold text-gray-700">{networkInfo?.symbol}</div>
                            </div>
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">
                                {networkInfo?.name} ({networkInfo?.symbol})
                              </h3>
                              <p className="text-sm text-gray-600">Configure payout wallet and fee settings</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleNetwork(network.network, network.token)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded-lg hover:bg-red-50 transition-colors duration-200"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Payout Wallet Address
                            </label>
                            <input
                              type="text"
                              value={network.payoutWallet}
                              onChange={(e) => updateNetworkConfig(network.network, network.token, 'payoutWallet', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm transition-colors duration-200"
                              placeholder={`Enter ${networkInfo?.symbol} address`}
                            />
                            {errors[`payoutWallet_${index}`] && (
                              <p className="mt-1 text-sm text-red-600">{errors[`payoutWallet_${index}`]}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Fee Payment
                            </label>
                            {form.applyToAllChains ? (
                              <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <div className="flex items-center">
                                  <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <p>Using global fee payment preference: <strong>{form.globalFeePayment === 'customer' ? 'Customer pays fee' : 'Fee deducted from payout'}</strong></p>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <label className="flex items-center p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                                  <input
                                    type="radio"
                                    checked={network.customerPaysFee}
                                    onChange={() => updateNetworkConfig(network.network, network.token, 'customerPaysFee', true)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                  />
                                  <div className="ml-3">
                                    <span className="text-sm font-medium text-gray-700">Customer pays fee</span>
                                    <p className="text-xs text-gray-500">Recommended for most use cases</p>
                                  </div>
                                </label>
                                <label className="flex items-center p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                                  <input
                                    type="radio"
                                    checked={!network.customerPaysFee}
                                    onChange={() => updateNetworkConfig(network.network, network.token, 'customerPaysFee', false)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                  />
                                  <div className="ml-3">
                                    <span className="text-sm font-medium text-gray-700">Fee deducted from payout</span>
                                    <p className="text-xs text-gray-500">Merchant absorbs the transaction fee</p>
                                  </div>
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Webhook Configuration */}
            <div className="bg-purple-50 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Webhook Configuration (Optional)
              </h2>
              
              <div className="space-y-4">
                <label className="flex items-center p-3 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors duration-200">
                  <input
                    type="checkbox"
                    checked={webhookEnabled}
                    onChange={(e) => setWebhookEnabled(e.target.checked)}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-900">Enable Webhooks</span>
                    <p className="text-xs text-gray-500">Receive real-time notifications about transaction events</p>
                  </div>
                </label>

                {webhookEnabled && (
                  <div className="bg-white p-4 rounded-lg border border-purple-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200"
                      placeholder="https://your-website.com/webhook"
                    />
                    <p className="mt-1 text-xs text-gray-600">Your endpoint to receive webhook notifications</p>
                    {errors.webhookUrl && (
                      <p className="mt-1 text-sm text-red-600">{errors.webhookUrl}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-600">{errors.submit}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Link
                href="/dashboard/api"
                className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center rounded-lg shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create API Key
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  )
}