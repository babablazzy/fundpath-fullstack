'use client'

import { useState } from 'react'
import Link from 'next/link'
import Footer from '@/components/Footer'

const sidebarItems = [
  { id: 'overview', label: 'Overview', icon: '📋' },
  { id: 'getting-started', label: 'Getting Started', icon: '🚀' },
  { id: 'authentication', label: 'Authentication', icon: '🔐' },
  { id: 'api-endpoints', label: 'API Endpoints', icon: '🔗' },
  { id: 'webhooks', label: 'Webhooks', icon: '🔔' },
  { id: 'integration-examples', label: 'Integration Examples', icon: '💻' },
  { id: 'payment-flow', label: 'Payment Flow', icon: '💸' },
  { id: 'networks', label: 'Supported Networks', icon: '🌐' },
  { id: 'error-handling', label: 'Error Handling', icon: '❌' },
  { id: 'best-practices', label: 'Best Practices', icon: '✅' }
]

export default function DeveloperDocs() {
  const [activeSection, setActiveSection] = useState('overview')

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId)
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 bg-white shadow-lg border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Integration Guide</h1>
                <p className="text-sm text-gray-600">FundPath Payment Gateway</p>
              </div>
            </div>

            <nav className="space-y-2">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center space-x-3 ${
                    activeSection === item.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <Link
                href="/docs/api"
                className="w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center space-x-3 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
                <span className="text-lg">📚</span>
                <span className="font-medium">API Reference</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <div className="max-w-6xl mx-auto px-8 py-8 flex-1">
            {/* Overview Section */}
            <section id="overview" className="mb-16">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <span className="text-2xl mr-3">📋</span>
                  Overview
                </h2>
                <p className="text-lg text-gray-700 mb-6">
                  FundPath is a non-custodial cryptocurrency payment gateway that allows merchants to accept crypto payments 
                  and automatically forward funds to their wallets. Our platform handles the complexity of multi-network 
                  support, payment detection, and fund forwarding while you focus on your business.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-blue-50 rounded-lg p-6">
                    <h3 className="font-semibold text-blue-900 mb-2">Non-Custodial</h3>
                    <p className="text-blue-700 text-sm">We never hold your funds. Payments are automatically forwarded to your wallet.</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-6">
                    <h3 className="font-semibold text-green-900 mb-2">Multi-Network</h3>
                    <p className="text-green-700 text-sm">Accept payments in BTC, ETH, BSC, TRX, TON, SOL and popular tokens.</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-6">
                    <h3 className="font-semibold text-purple-900 mb-2">Real-Time</h3>
                    <p className="text-purple-700 text-sm">Instant payment detection and webhook notifications for seamless integration.</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
                  <h3 className="text-xl font-semibold mb-3">How It Works</h3>
                  <div className="space-y-3 text-blue-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-white text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">1</div>
                      <span>Create a payment request via our API</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-white text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">2</div>
                      <span>Customer pays to the generated temporary address</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-white text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">3</div>
                      <span>FundPath detects the payment and forwards it to your wallet</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-white text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">4</div>
                      <span>You receive a webhook notification when the transaction is complete</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Getting Started Section */}
            <section id="getting-started" className="mb-16">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <span className="text-2xl mr-3">🚀</span>
                  Getting Started
                </h2>
                
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Start Guide</h3>
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-medium text-gray-900 mb-3">1. Create Your Account</h4>
                      <p className="text-gray-600 mb-3">Sign up at FundPath and complete your merchant verification.</p>
                      <div className="bg-blue-50 rounded p-3">
                        <p className="text-blue-700 text-sm">Visit <a href="/auth/signup" className="underline font-medium">fundpath.com/signup</a> to get started</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-medium text-gray-900 mb-3">2. Generate API Key</h4>
                      <p className="text-gray-600 mb-3">Create an API key from your dashboard with the required permissions.</p>
                      <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-green-400 text-sm">
{`// Your API key will look like this:
fp_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`}
                        </pre>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-medium text-gray-900 mb-3">3. Configure Webhooks</h4>
                      <p className="text-gray-600 mb-3">Set up webhook endpoints to receive real-time payment notifications.</p>
                      <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-green-400 text-sm">
{`// Configure webhook URL in your API key settings
https://your-domain.com/webhooks/fundpath`}
                        </pre>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-medium text-gray-900 mb-3">4. Start Accepting Payments</h4>
                      <p className="text-gray-600 mb-3">Use our API to create payment requests and handle transactions.</p>
                      <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-green-400 text-sm">
{`// Create your first payment request
POST /api/transactions/create
Authorization: Bearer fp_your_api_key_here

{
  "network": "BTC",
  "amount": "1000000",
  "merchantWalletAddress": "bc1q..."
}`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Continue with other sections... */}
            <div className="text-center py-8">
              <p className="text-gray-600">More sections coming soon...</p>
              <Link
                href="/docs/api"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 mt-4"
              >
                View Complete API Reference
              </Link>
            </div>
          </div>
          
          <Footer />
        </div>
      </div>
    </div>
  )
}
