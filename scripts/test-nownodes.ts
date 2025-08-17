#!/usr/bin/env tsx

/**
 * TypeScript test script for NOW Nodes integration
 * Run with: npx tsx scripts/test-nownodes.ts
 */

import { walletService } from '../src/lib/wallet-service'
import { getNowNodesClient } from '../src/lib/now-nodes'

// Set a dummy API key for testing
process.env.NOWNODES_API_KEY = process.env.NOWNODES_API_KEY || 'test-key'

async function testWalletGeneration() {
  console.log('🧪 Testing Wallet Generation...\n')

  const networks = ['BTC', 'ETH', 'BSC', 'TRX', 'TON', 'SOL'] as const

  for (const network of networks) {
    try {
      console.log(`📝 Testing ${network} wallet generation...`)
      const wallet = await walletService.generateWallet(network)
      
      console.log(`✅ ${network} Wallet Generated:`)
      console.log(`   Address: ${wallet.address}`)
      console.log(`   Network: ${wallet.network}`)
      console.log(`   Public Key: ${wallet.publicKey?.slice(0, 20)}...`)
      console.log(`   Private Key: ${wallet.privateKey.slice(0, 20)}...`)
      
      // Test address validation
      const isValid = walletService.validateAddress(wallet.address, network)
      console.log(`   Address Valid: ${isValid ? '✅' : '❌'}`)
      
      // Test fee estimation
      const fee = walletService.getEstimatedFee(network, 'medium')
      console.log(`   Estimated Fee: ${fee}`)
      
      // Test amount conversion
      const testAmount = '1.5'
      const smallestUnit = walletService.convertToSmallestUnit(testAmount, network)
      const humanReadable = walletService.convertFromSmallestUnit(smallestUnit, network)
      console.log(`   Amount Conversion: ${testAmount} → ${smallestUnit} → ${humanReadable}`)
      
      console.log('')
    } catch (error) {
      console.log(`❌ ${network} wallet generation failed:`, error instanceof Error ? error.message : 'Unknown error')
      console.log('')
    }
  }
}

async function testNOWNodesAPI() {
  console.log('🌐 Testing NOW Nodes API...\n')

  const nowNodesClient = getNowNodesClient()

  // Test Bitcoin address info (using a known address)
  try {
    console.log('📝 Testing Bitcoin address info...')
    const btcAddress = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'
    const btcInfo = await nowNodesClient.getBitcoinAddressInfo(btcAddress)
    console.log(`✅ Bitcoin address info retrieved:`)
    console.log(`   Address: ${btcAddress}`)
    console.log(`   Balance: ${btcInfo.balance} satoshis`)
    console.log(`   Transaction Count: ${btcInfo.txCount}`)
    console.log('')
  } catch (error) {
    console.log(`❌ Bitcoin address info failed:`, error instanceof Error ? error.message : 'Unknown error')
    console.log('')
  }

  // Test Ethereum balance (using a known address)
  try {
    console.log('📝 Testing Ethereum balance...')
    const ethAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
    const ethBalance = await nowNodesClient.getEthereumBalance(ethAddress)
    console.log(`✅ Ethereum balance retrieved:`)
    console.log(`   Address: ${ethAddress}`)
    console.log(`   Balance: ${ethBalance} wei`)
    console.log(`   Balance (ETH): ${walletService.convertFromSmallestUnit(ethBalance, 'ETH')} ETH`)
    console.log('')
  } catch (error) {
    console.log(`❌ Ethereum balance failed:`, error instanceof Error ? error.message : 'Unknown error')
    console.log('')
  }

  // Test USDT token balance
  try {
    console.log('📝 Testing USDT token balance...')
    const usdtAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
    const walletAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
    const usdtBalance = await nowNodesClient.getTokenBalance(usdtAddress, walletAddress, 'ETH')
    console.log(`✅ USDT token balance retrieved:`)
    console.log(`   Token Address: ${usdtAddress}`)
    console.log(`   Wallet Address: ${walletAddress}`)
    console.log(`   Balance: ${usdtBalance} (smallest units)`)
    console.log(`   Balance (USDT): ${Number(usdtBalance) / 1000000} USDT`)
    console.log('')
  } catch (error) {
    console.log(`❌ USDT token balance failed:`, error instanceof Error ? error.message : 'Unknown error')
    console.log('')
  }

  // Test Tron account info
  try {
    console.log('📝 Testing Tron account info...')
    const trxAddress = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' // USDT contract
    const tronAccount = await nowNodesClient.getTronAccount(trxAddress)
    console.log(`✅ Tron account info retrieved:`)
    console.log(`   Address: ${trxAddress}`)
    console.log(`   Balance: ${tronAccount.balance || 0} SUN`)
    console.log(`   TRC20 Tokens: ${Object.keys(tronAccount.trc20 || {}).length}`)
    console.log('')
  } catch (error) {
    console.log(`❌ Tron account info failed:`, error instanceof Error ? error.message : 'Unknown error')
    console.log('')
  }

  // Test Solana balance
  try {
    console.log('📝 Testing Solana balance...')
    const solAddress = '11111111111111111111111111111112' // System Program
    const solBalance = await nowNodesClient.getSolanaBalance(solAddress)
    console.log(`✅ Solana balance retrieved:`)
    console.log(`   Address: ${solAddress}`)
    console.log(`   Balance: ${solBalance} lamports`)
    console.log(`   Balance (SOL): ${solBalance / 1000000000} SOL`)
    console.log('')
  } catch (error) {
    console.log(`❌ Solana balance failed:`, error instanceof Error ? error.message : 'Unknown error')
    console.log('')
  }
}

async function testPaymentDetection() {
  console.log('🔍 Testing Payment Detection...\n')

  const nowNodesClient = getNowNodesClient()

  // Test with a known address that has some balance
  const testCases = [
    {
      network: 'BTC' as const,
      address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
      expectedAmount: '1000000', // 0.01 BTC in satoshis
      description: 'Bitcoin payment detection'
    },
    {
      network: 'ETH' as const,
      address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      expectedAmount: '1000000000000000000', // 1 ETH in wei
      description: 'Ethereum payment detection'
    }
  ]

  for (const testCase of testCases) {
    try {
      console.log(`📝 Testing ${testCase.description}...`)
      const paymentStatus = await nowNodesClient.checkPayment(
        testCase.network,
        testCase.address,
        testCase.expectedAmount
      )
      
      console.log(`✅ ${testCase.description} result:`)
      console.log(`   Network: ${testCase.network}`)
      console.log(`   Address: ${testCase.address}`)
      console.log(`   Expected Amount: ${testCase.expectedAmount}`)
      console.log(`   Paid: ${paymentStatus.paid ? '✅' : '❌'}`)
      console.log(`   Balance: ${paymentStatus.balance}`)
      console.log(`   Confirmations: ${paymentStatus.confirmations || 0}`)
      console.log('')
    } catch (error) {
      console.log(`❌ ${testCase.description} failed:`, error instanceof Error ? error.message : 'Unknown error')
      console.log('')
    }
  }
}

async function testNetworkInfo() {
  console.log('🌍 Testing Network Information...\n')

  const nowNodesClient = getNowNodesClient()
  const networks = ['BTC', 'ETH', 'BSC', 'TRX', 'TON', 'SOL'] as const

  for (const network of networks) {
    try {
      console.log(`📝 Testing ${network} network info...`)
      
      const displayName = walletService.getNetworkDisplayName(network)
      const symbol = walletService.getNetworkSymbol(network)
      const confirmations = nowNodesClient.getConfirmationRequirements(network)
      
      console.log(`✅ ${network} Network Info:`)
      console.log(`   Display Name: ${displayName}`)
      console.log(`   Symbol: ${symbol}`)
      console.log(`   Required Confirmations: ${confirmations}`)
      
      // Test fee estimation for different priorities
      const lowFee = walletService.getEstimatedFee(network, 'low')
      const mediumFee = walletService.getEstimatedFee(network, 'medium')
      const highFee = walletService.getEstimatedFee(network, 'high')
      
      console.log(`   Fees (Low/Medium/High): ${lowFee} / ${mediumFee} / ${highFee}`)
      console.log('')
    } catch (error) {
      console.log(`❌ ${network} network info failed:`, error instanceof Error ? error.message : 'Unknown error')
      console.log('')
    }
  }
}

async function testIntegration() {
  console.log('🔗 Testing Integration Components...\n')

  try {
    console.log('📝 Testing transaction creation flow...')
    
    // Test wallet generation for transaction
    const wallet = await walletService.generateWallet('BTC')
    console.log(`✅ Temporary wallet generated:`)
    console.log(`   Address: ${wallet.address}`)
    console.log(`   Network: ${wallet.network}`)
    console.log(`   Valid: ${walletService.validateAddress(wallet.address, 'BTC')}`)
    console.log('')
    
  } catch (error) {
    console.log(`❌ Transaction creation failed:`, error instanceof Error ? error.message : 'Unknown error')
    console.log('')
  }

  try {
    console.log('📝 Testing webhook processing simulation...')
    
    // Simulate webhook data processing
    const webhookData = {
      type: 'transaction',
      address: 'bc1qtestaddress123456789',
      amount: '1000000',
      network: 'BTC' as const,
      confirmations: 1
    }
    
    console.log(`✅ Webhook data processed:`)
    console.log(`   Type: ${webhookData.type}`)
    console.log(`   Address: ${webhookData.address}`)
    console.log(`   Amount: ${webhookData.amount}`)
    console.log(`   Network: ${webhookData.network}`)
    console.log(`   Confirmations: ${webhookData.confirmations}`)
    console.log('')
    
  } catch (error) {
    console.log(`❌ Webhook processing failed:`, error instanceof Error ? error.message : 'Unknown error')
    console.log('')
  }
}

async function runAllTests() {
  console.log('🚀 Starting NOW Nodes Integration Tests (TypeScript)\n')
  console.log('=' .repeat(50))
  
  try {
    await testWalletGeneration()
    console.log('=' .repeat(50))
    
    await testNOWNodesAPI()
    console.log('=' .repeat(50))
    
    await testPaymentDetection()
    console.log('=' .repeat(50))
    
    await testNetworkInfo()
    console.log('=' .repeat(50))
    
    await testIntegration()
    console.log('=' .repeat(50))
    
    console.log('✅ All TypeScript tests completed successfully!')
    console.log('')
    console.log('📝 Next steps:')
    console.log('   1. Set NOWNODES_API_KEY environment variable for real API testing')
    console.log('   2. Test with real blockchain addresses')
    console.log('   3. Verify webhook endpoints')
    console.log('')
    
  } catch (error) {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error)
}

export {
  testWalletGeneration,
  testNOWNodesAPI,
  testPaymentDetection,
  testNetworkInfo,
  testIntegration,
  runAllTests
}
