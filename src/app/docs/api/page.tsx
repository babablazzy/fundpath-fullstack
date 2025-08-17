'use client'

import { useState } from 'react'
import Link from 'next/link'
import Footer from '@/components/Footer'

const sidebarItems = [
  { id: 'authentication', label: 'Authentication', icon: '🔐' },
  { id: 'transactions', label: 'Transactions', icon: '💸' },
  { id: 'webhooks', label: 'Webhooks', icon: '🔔' },
  { id: 'errors', label: 'Error Codes', icon: '❌' },
  { id: 'rate-limits', label: 'Rate Limits', icon: '⏱️' }
]

export default function ApiReference() {
  const [activeSection, setActiveSection] = useState('authentication')

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
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">API Reference</h1>
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
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
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
                href="/docs"
                className="w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center space-x-3 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
                <span className="text-lg">📖</span>
                <span className="font-medium">Integration Guide</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <div className="max-w-6xl mx-auto px-8 py-8 flex-1">
            {/* Authentication Section */}
            <section id="authentication" className="mb-16">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <span className="text-2xl mr-3">🔐</span>
                  Authentication
                </h2>
                
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">API Key Authentication</h3>
                  <p className="text-gray-700 mb-6">
                    All API requests require authentication using your API key. Include it in the Authorization header 
                    of your HTTP requests.
                  </p>
                  
                  <div className="bg-blue-50 rounded-lg p-6">
                    <h4 className="font-medium text-blue-900 mb-2">Authentication Header</h4>
                    <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                      <pre className="text-green-400 text-sm">
{`Authorization: Bearer fp_your_api_key_here

// Example:
Authorization: Bearer fp_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Getting Your API Key</h3>
                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">1. Access Your Dashboard</h4>
                      <p className="text-gray-600 text-sm mb-3">Log in to your FundPath merchant dashboard.</p>
                      <div className="bg-blue-50 rounded p-3">
                        <p className="text-blue-700 text-sm">Visit <a href="/dashboard" className="underline font-medium">fundpath.com/dashboard</a></p>
                      </div>
                    </div>
                    
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">2. Navigate to API Keys</h4>
                      <p className="text-gray-600 text-sm mb-3">Go to the API section in your dashboard.</p>
                      <div className="bg-blue-50 rounded p-3">
                        <p className="text-blue-700 text-sm">Click on "API Keys" in the sidebar</p>
                      </div>
                    </div>
                    
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">3. Create New API Key</h4>
                      <p className="text-gray-600 text-sm mb-3">Generate a new API key with your preferred settings.</p>
                      <div className="bg-green-50 rounded p-3">
                        <ul className="text-green-700 text-sm space-y-1">
                          <li>• Set business name and website URL</li>
                          <li>• Configure webhook endpoints</li>
                          <li>• Select supported networks and tokens</li>
                          <li>• Set payout wallet addresses</li>
                          <li>• Configure fee payment preferences</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Security Best Practices</h3>
                  <div className="bg-yellow-50 rounded-lg p-6">
                    <h4 className="font-medium text-yellow-900 mb-3">Keep Your API Key Secure</h4>
                    <ul className="text-yellow-700 text-sm space-y-2">
                      <li>• Store API keys in environment variables, never in code</li>
                      <li>• Use HTTPS for all API requests</li>
                      <li>• Rotate API keys regularly</li>
                      <li>• Monitor API usage for suspicious activity</li>
                      <li>• Use webhook signatures to verify authenticity</li>
                      <li>• Never expose API keys in client-side code</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Transactions Section */}
            <section id="transactions" className="mb-16">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <span className="text-2xl mr-3">💸</span>
                  Transactions
                </h2>
                
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Create Transaction</h3>
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">POST</span>
                      <code className="text-gray-900 font-mono text-lg">/api/transactions/create</code>
                    </div>
                    <p className="text-gray-600 mb-4">Create a new payment request and generate a temporary wallet address for the customer.</p>
                    
                    <div className="mb-4">
                      <h5 className="font-medium text-gray-900 mb-2">Request Body</h5>
                      <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-green-400 text-sm">
{`{
  "network": "BTC",
  "token": "BTC",
  "amount": "1000000",
  "amountUsd": 500.00,
  "customerPaysFee": true,
  "merchantWalletAddress": "bc1q..."
}`}
                        </pre>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <h5 className="font-medium text-gray-900 mb-2">Response</h5>
                      <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-green-400 text-sm">
{`{
  "success": true,
  "data": {
    "transactionId": "clx1234567890",
    "tempWalletAddress": "bc1q...",
    "amount": "1000000",
    "feeAmount": "5000",
    "totalAmount": "1005000",
    "expiresAt": "2024-01-01T12:30:00Z",
    "network": "BTC",
    "token": "BTC",
    "qrCode": "data:image/png;base64,..."
  }
}`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Get Transaction Status</h3>
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">GET</span>
                      <code className="text-gray-900 font-mono text-lg">/api/transactions/{'{id}'}/status</code>
                    </div>
                    <p className="text-gray-600 mb-4">Check the status of a specific transaction including payment confirmations.</p>
                    
                    <div className="mb-4">
                      <h5 className="font-medium text-gray-900 mb-2">Response</h5>
                      <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-green-400 text-sm">
{`{
  "success": true,
  "data": {
    "status": "PAID",
    "transaction": {
      "id": "clx1234567890",
      "network": "BTC",
      "amount": "1000000",
      "status": "PAID",
      "confirmations": 3,
      "incomingTxHash": "abc123...",
      "paidAt": "2024-01-01T10:15:00Z"
    }
  }
}`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">List Transactions</h3>
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">GET</span>
                      <code className="text-gray-900 font-mono text-lg">/api/transactions</code>
                    </div>
                    <p className="text-gray-600 mb-4">List all transactions with filtering and pagination options.</p>
                    
                    <div className="mb-4">
                      <h5 className="font-medium text-gray-900 mb-2">Query Parameters</h5>
                      <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-green-400 text-sm">
{`?status=COMPLETED&network=BTC&limit=20&offset=0&startDate=2024-01-01&endDate=2024-01-31`}
                        </pre>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <h5 className="font-medium text-gray-900 mb-2">Available Filters</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded p-3">
                          <h6 className="font-medium text-gray-900 mb-2">Status</h6>
                          <ul className="text-gray-600 text-sm space-y-1">
                            <li>• PENDING</li>
                            <li>• PAID</li>
                            <li>• FORWARDING</li>
                            <li>• COMPLETED</li>
                            <li>• FAILED</li>
                            <li>• EXPIRED</li>
                          </ul>
                        </div>
                        <div className="bg-gray-50 rounded p-3">
                          <h6 className="font-medium text-gray-900 mb-2">Networks</h6>
                          <ul className="text-gray-600 text-sm space-y-1">
                            <li>• BTC</li>
                            <li>• ETH</li>
                            <li>• BSC</li>
                            <li>• TRX</li>
                            <li>• TON</li>
                            <li>• SOL</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <h5 className="font-medium text-gray-900 mb-2">Response</h5>
                      <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-green-400 text-sm">
{`{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "clx1234567890",
        "network": "BTC",
        "amount": "1000000",
        "status": "COMPLETED",
        "createdAt": "2024-01-01T10:00:00Z",
        "completedAt": "2024-01-01T10:15:00Z"
      }
    ],
    "pagination": {
      "total": 100,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Webhooks Section */}
            <section id="webhooks" className="mb-16">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <span className="text-2xl mr-3">🔔</span>
                  Webhooks
                </h2>
                
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">NOW Nodes Webhook</h3>
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">POST</span>
                      <code className="text-gray-900 font-mono text-lg">/api/webhooks/now-nodes</code>
                    </div>
                    <p className="text-gray-600 mb-4">Webhook endpoint for NOW Nodes payment notifications.</p>
                    
                    <div className="mb-4">
                      <h5 className="font-medium text-gray-900 mb-2">Headers</h5>
                      <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-green-400 text-sm">
{`Content-Type: application/json
x-nownodes-signature: HMAC-SHA256 signature`}
                        </pre>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <h5 className="font-medium text-gray-900 mb-2">Webhook Payload</h5>
                      <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-green-400 text-sm">
{`{
  "type": "transaction",
  "network": "BTC",
  "address": "bc1q...",
  "txHash": "abc123...",
  "amount": "1000000",
  "confirmations": 1,
  "timestamp": "2024-01-01T10:15:00Z"
}`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Merchant Webhooks</h3>
                  <p className="text-gray-700 mb-4">
                    FundPath automatically forwards payment notifications to merchant webhook URLs configured in their API keys.
                  </p>
                  
                  <div className="bg-blue-50 rounded-lg p-6">
                    <h4 className="font-medium text-blue-900 mb-2">Webhook Events</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-blue-700 text-sm">payment.received - Payment detected on temporary wallet</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-blue-700 text-sm">payment.forwarded - Funds forwarded to merchant wallet</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-blue-700 text-sm">transaction.completed - Transaction fully completed</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-blue-700 text-sm">transaction.failed - Transaction failed</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Error Codes Section */}
            <section id="errors" className="mb-16">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <span className="text-2xl mr-3">❌</span>
                  Error Codes
                </h2>
                
                <div className="space-y-6">
                  <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <h3 className="font-medium text-red-900 mb-2">400 Bad Request</h3>
                    <p className="text-red-700 text-sm mb-2">Invalid request parameters or missing required fields.</p>
                    <div className="bg-red-100 rounded p-3">
                      <pre className="text-red-800 text-sm">
{`{
  "error": "VALIDATION_ERROR",
  "message": "Invalid network: UNSUPPORTED",
  "details": {
    "field": "network",
    "value": "UNSUPPORTED",
    "allowed": ["BTC", "ETH", "BSC", "TRX", "TON", "SOL"]
  }
}`}
                      </pre>
                    </div>
                  </div>
                  
                  <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <h3 className="font-medium text-red-900 mb-2">401 Unauthorized</h3>
                    <p className="text-red-700 text-sm mb-2">Authentication required or session expired.</p>
                    <div className="bg-red-100 rounded p-3">
                      <pre className="text-red-800 text-sm">
{`{
  "error": "UNAUTHORIZED",
  "message": "Authentication required"
}`}
                      </pre>
                    </div>
                  </div>
                  
                  <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <h3 className="font-medium text-red-900 mb-2">429 Too Many Requests</h3>
                    <p className="text-red-700 text-sm mb-2">Rate limit exceeded.</p>
                    <div className="bg-red-100 rounded p-3">
                      <pre className="text-red-800 text-sm">
{`{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests",
  "retryAfter": 60
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Rate Limits Section */}
            <section id="rate-limits" className="mb-16">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <span className="text-2xl mr-3">⏱️</span>
                  Rate Limits
                </h2>
                
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Rate Limit Policy</h3>
                  <p className="text-gray-700 mb-4">
                    FundPath API implements rate limiting to ensure fair usage and system stability. 
                    Rate limits are applied per authenticated user and IP address.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-blue-50 rounded-lg p-6">
                      <h4 className="font-medium text-blue-900 mb-2">Standard Plan</h4>
                      <div className="text-blue-700">
                        <p className="text-2xl font-bold">100</p>
                        <p className="text-sm">requests per minute</p>
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-6">
                      <h4 className="font-medium text-green-900 mb-2">Pro Plan</h4>
                      <div className="text-green-700">
                        <p className="text-2xl font-bold">500</p>
                        <p className="text-sm">requests per minute</p>
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-6">
                      <h4 className="font-medium text-purple-900 mb-2">Enterprise</h4>
                      <div className="text-purple-700">
                        <p className="text-2xl font-bold">1000</p>
                        <p className="text-sm">requests per minute</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Rate Limit Headers</h3>
                  <div className="bg-gray-900 rounded-lg p-6 overflow-x-auto">
                    <pre className="text-green-400 text-sm">
{`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
Retry-After: 60`}
                    </pre>
                  </div>
                </div>
              </div>
            </section>

            {/* Navigation to Developer Docs */}
            <div className="text-center py-8">
              <p className="text-gray-600">More sections coming soon...</p>
              <Link
                href="/docs"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 mt-4"
              >
                View Complete Integration Guide
              </Link>
            </div>
          </div>
          
          <Footer />
        </div>
      </div>
    </div>
  )
}
