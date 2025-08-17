'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface TwoFactorStatus {
  enabled: boolean
  secret?: string
  qrCodeUrl?: string
}

export default function TwoFactorPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus>({ enabled: false })
  const [setupMode, setSetupMode] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    fetchTwoFactorStatus()
  }, [session, status, router])

  const fetchTwoFactorStatus = async () => {
    try {
      const response = await fetch('/api/auth/2fa/status')
      if (response.ok) {
        const data = await response.json()
        setTwoFactorStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch 2FA status:', error)
    }
  }

  const setupTwoFactor = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const data = await response.json()
        setTwoFactorStatus({
          enabled: false,
          secret: data.secret,
          qrCodeUrl: data.qrCodeUrl
        })
        setSetupMode(true)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to setup 2FA')
      }
    } catch (error) {
      setError('Failed to setup 2FA')
    } finally {
      setLoading(false)
    }
  }

  const verifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode })
      })
      
      if (response.ok) {
        setSuccess('2FA enabled successfully!')
        setSetupMode(false)
        setVerificationCode('')
        fetchTwoFactorStatus()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Invalid verification code')
      }
    } catch (error) {
      setError('Failed to verify 2FA code')
    } finally {
      setLoading(false)
    }
  }

  const disableTwoFactor = async () => {
    if (!disableCode || disableCode.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: disableCode })
      })
      
      if (response.ok) {
        setSuccess('2FA disabled successfully!')
        setDisableCode('')
        fetchTwoFactorStatus()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Invalid code')
      }
    } catch (error) {
      setError('Failed to disable 2FA')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Two-Factor Authentication</h1>
          
          {/* Status */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Status</h2>
                <p className="text-gray-600">
                  {twoFactorStatus.enabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                twoFactorStatus.enabled 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {twoFactorStatus.enabled ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {/* Setup Mode */}
          {setupMode && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Setup 2FA</h3>
              
              {/* QR Code */}
              {twoFactorStatus.qrCodeUrl && (
                <div className="mb-4 text-center">
                  <img 
                    src={twoFactorStatus.qrCodeUrl} 
                    alt="2FA QR Code" 
                    className="mx-auto mb-2"
                  />
                  <p className="text-sm text-blue-700">
                    Scan this QR code with your authenticator app
                  </p>
                </div>
              )}

              {/* Manual Secret */}
              {twoFactorStatus.secret && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    Manual Entry Secret:
                  </label>
                  <div className="bg-white p-3 rounded border">
                    <code className="text-sm break-all text-gray-800">
                      {twoFactorStatus.secret}
                    </code>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(twoFactorStatus.secret!)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Copy secret
                  </button>
                </div>
              )}

              {/* Verification */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-blue-900 mb-2">
                  Enter 6-digit code from your authenticator app:
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={verifyAndEnable}
                  disabled={loading || verificationCode.length !== 6}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Enable 2FA'}
                </button>
                <button
                  onClick={() => {
                    setSetupMode(false)
                    setVerificationCode('')
                    setError(null)
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          {!setupMode && (
            <div className="space-y-4">
              {!twoFactorStatus.enabled ? (
                <button
                  onClick={setupTwoFactor}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Setting up...' : 'Enable 2FA'}
                </button>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-4">Disable 2FA</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-yellow-900 mb-2">
                      Enter your 6-digit code to disable 2FA:
                    </label>
                    <input
                      type="text"
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      placeholder="000000"
                      maxLength={6}
                    />
                  </div>

                  <button
                    onClick={disableTwoFactor}
                    disabled={loading || disableCode.length !== 6}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Disabling...' : 'Disable 2FA'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Information */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">About 2FA</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Two-factor authentication adds an extra layer of security to your account</li>
              <li>• You'll need to enter a 6-digit code from your authenticator app when signing in</li>
              <li>• We recommend using apps like Google Authenticator, Authy, or Microsoft Authenticator</li>
              <li>• Keep your backup codes safe in case you lose access to your authenticator app</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
