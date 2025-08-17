// Define network types based on our schema
type Network = 'BTC' | 'ETH' | 'BSC' | 'TRX' | 'TON' | 'SOL'

// NOW Nodes API endpoints as per documentation
const NOW_NODES_ENDPOINTS = {
  // Full Node RPC endpoints
  BTC: 'https://btc.nownodes.io',
  ETH: 'https://eth.nownodes.io',
  BSC: 'https://bsc.nownodes.io',
  TRX: 'https://trx.nownodes.io',
  TON: 'https://ton.nownodes.io',
  SOL: 'https://sol.nownodes.io',
  
  // Explorer (Blockbook) endpoints
  BTC_EXPLORER: 'https://btcbook.nownodes.io',
  ETH_EXPLORER: 'https://eth-blockbook.nownodes.io',
  BSC_EXPLORER: 'https://bsc-blockbook.nownodes.io',
  TRX_EXPLORER: 'https://trx-blockbook.nownodes.io',
  
  // TON Indexer
  TON_INDEXER: 'https://ton-index.nownodes.io'
}

// Network to endpoint mapping
const NETWORK_ENDPOINTS = {
  BTC: { rpc: NOW_NODES_ENDPOINTS.BTC, explorer: NOW_NODES_ENDPOINTS.BTC_EXPLORER },
  ETH: { rpc: NOW_NODES_ENDPOINTS.ETH, explorer: NOW_NODES_ENDPOINTS.ETH_EXPLORER },
  BSC: { rpc: NOW_NODES_ENDPOINTS.BSC, explorer: NOW_NODES_ENDPOINTS.BSC_EXPLORER },
  TRX: { rpc: NOW_NODES_ENDPOINTS.TRX, explorer: NOW_NODES_ENDPOINTS.TRX_EXPLORER },
  TON: { rpc: NOW_NODES_ENDPOINTS.TON, indexer: NOW_NODES_ENDPOINTS.TON_INDEXER },
  SOL: { rpc: NOW_NODES_ENDPOINTS.SOL }
}

// Token contract addresses
const TOKEN_CONTRACTS = {
  USDT_ETH: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  USDC_ETH: '0xA0b86991c6218b36c1d19D4a2e9EB0cE3606EB48',
  USDT_TRX: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
}

export class NowNodesClient {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.NOWNODES_API_KEY || 'test-key'
  }

  private getHeaders(): HeadersInit {
    return {
      'api-key': this.apiKey,
      'Content-Type': 'application/json'
    }
  }

  private async makeRequest(url: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers
      }
    })

    if (!response.ok) {
      throw new Error(`NOW Nodes API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Bitcoin methods
  async getBitcoinAddressInfo(address: string): Promise<any> {
    const url = `${NOW_NODES_ENDPOINTS.BTC_EXPLORER}/api/v2/address/${address}`
    return this.makeRequest(url)
  }

  async getBitcoinUTXOs(address: string): Promise<any> {
    const url = `${NOW_NODES_ENDPOINTS.BTC_EXPLORER}/api/v2/utxo/${address}`
    return this.makeRequest(url)
  }

  async broadcastBitcoinTransaction(rawTxHex: string): Promise<string> {
    const url = `${NOW_NODES_ENDPOINTS.BTC}`
    const payload = {
      jsonrpc: '2.0',
      id: 'sendTx',
      method: 'sendrawtransaction',
      params: [rawTxHex]
    }
    
    const response = await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    
    return response.result
  }

  // Ethereum/BSC methods
  async getEthereumBalance(address: string, network: 'ETH' | 'BSC' = 'ETH'): Promise<string> {
    const endpoint = network === 'ETH' ? NOW_NODES_ENDPOINTS.ETH : NOW_NODES_ENDPOINTS.BSC
    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getBalance',
      params: [address, 'latest']
    }
    
    const response = await this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    
    return response.result
  }

  async getTokenBalance(
    tokenAddress: string, 
    walletAddress: string, 
    network: 'ETH' | 'BSC' = 'ETH'
  ): Promise<string> {
    const endpoint = network === 'ETH' ? NOW_NODES_ENDPOINTS.ETH : NOW_NODES_ENDPOINTS.BSC
    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{
        to: tokenAddress,
        data: `0x70a08231000000000000000000000000${walletAddress.slice(2)}` // balanceOf(address)
      }, 'latest']
    }
    
    const response = await this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    
    return response.result
  }

  async broadcastEthereumTransaction(signedTxHex: string, network: 'ETH' | 'BSC' = 'ETH'): Promise<string> {
    const endpoint = network === 'ETH' ? NOW_NODES_ENDPOINTS.ETH : NOW_NODES_ENDPOINTS.BSC
    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_sendRawTransaction',
      params: [signedTxHex]
    }
    
    const response = await this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    
    return response.result
  }

  // Tron methods
  async getTronAccount(address: string): Promise<any> {
    const url = `${NOW_NODES_ENDPOINTS.TRX}/wallet/getaccount`
    const payload = { address }
    
    return this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }

  async broadcastTronTransaction(signedTxHex: string): Promise<any> {
    const url = `${NOW_NODES_ENDPOINTS.TRX}/wallet/broadcasttransaction`
    const payload = { transaction: signedTxHex }
    
    return this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }

  // TON methods
  async getTonTransactions(account: string, limit: number = 10): Promise<any> {
    const url = `${NOW_NODES_ENDPOINTS.TON_INDEXER}/transactions?account=${account}&limit=${limit}&sort=desc`
    return this.makeRequest(url)
  }

  async getTonAccountInfo(account: string): Promise<any> {
    const url = `${NOW_NODES_ENDPOINTS.TON_INDEXER}/accounts/${account}`
    return this.makeRequest(url)
  }

  // Solana methods
  async getSolanaBalance(address: string): Promise<number> {
    const url = `${NOW_NODES_ENDPOINTS.SOL}`
    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'getBalance',
      params: [address, { commitment: 'confirmed' }]
    }
    
    const response = await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    
    return response.result.value
  }

  async broadcastSolanaTransaction(signedTxHex: string): Promise<string> {
    const url = `${NOW_NODES_ENDPOINTS.SOL}`
    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'sendTransaction',
      params: [signedTxHex, { encoding: 'base64' }]
    }
    
    const response = await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    
    return response.result
  }

  // Generic payment detection method
  async checkPayment(
    network: Network,
    address: string,
    expectedAmount: string,
    tokenAddress?: string
  ): Promise<{ paid: boolean; balance: string; confirmations?: number }> {
    try {
      switch (network) {
        case 'BTC':
          const btcInfo = await this.getBitcoinAddressInfo(address)
          const balanceSat = parseInt(btcInfo.balance)
          const expectedSat = Math.floor(parseFloat(expectedAmount) * 100000000) // Convert BTC to satoshis
          return {
            paid: balanceSat >= expectedSat,
            balance: (balanceSat / 100000000).toString(),
            confirmations: btcInfo.txCount > 0 ? 1 : 0
          }

        case 'ETH':
        case 'BSC':
          if (tokenAddress) {
            // ERC-20 token payment
            const tokenBalance = await this.getTokenBalance(tokenAddress, address, network)
            const expectedWei = BigInt(expectedAmount)
            return {
              paid: BigInt(tokenBalance) >= expectedWei,
              balance: tokenBalance,
              confirmations: 1
            }
          } else {
            // Native coin payment
            const balanceWei = await this.getEthereumBalance(address, network)
            const expectedWei = BigInt(expectedAmount)
            return {
              paid: BigInt(balanceWei) >= expectedWei,
              balance: balanceWei,
              confirmations: 1
            }
          }

        case 'TRX':
          const tronAccount = await this.getTronAccount(address)
          if (tokenAddress) {
            // TRC-20 token payment
            const tokenBalance = tronAccount.trc20?.[tokenAddress] || '0'
            const expectedSun = BigInt(expectedAmount)
            return {
              paid: BigInt(tokenBalance) >= expectedSun,
              balance: tokenBalance,
              confirmations: 1
            }
          } else {
            // TRX payment
            const balanceSun = BigInt(tronAccount.balance || '0')
            const expectedSun = BigInt(expectedAmount)
            return {
              paid: balanceSun >= expectedSun,
              balance: balanceSun.toString(),
              confirmations: 1
            }
          }

        case 'TON':
          const tonAccount = await this.getTonAccountInfo(address)
          const balanceNano = BigInt(tonAccount.balance || '0')
          const expectedNano = BigInt(expectedAmount)
          return {
            paid: balanceNano >= expectedNano,
            balance: balanceNano.toString(),
            confirmations: 1
          }

        case 'SOL':
          const balanceLamports = await this.getSolanaBalance(address)
          const expectedLamports = Math.floor(parseFloat(expectedAmount) * 1000000000) // Convert SOL to lamports
          return {
            paid: balanceLamports >= expectedLamports,
            balance: (balanceLamports / 1000000000).toString(),
            confirmations: 1
          }

        default:
          throw new Error(`Unsupported network: ${network}`)
      }
    } catch (error) {
      console.error(`Error checking payment for ${network} address ${address}:`, error)
      throw error
    }
  }

  // Get network-specific confirmation requirements
  getConfirmationRequirements(network: Network): number {
    switch (network) {
      case 'BTC':
        return 1 // Can be adjusted based on security requirements
      case 'ETH':
      case 'BSC':
        return 12 // Ethereum recommends 12+ confirmations
      case 'TRX':
        return 1 // Tron has fast finality
      case 'TON':
        return 1 // TON has fast finality
      case 'SOL':
        return 1 // Solana has fast finality
      default:
        return 1
    }
  }

  // Get token contract address
  getTokenContractAddress(token: string, network: Network): string | null {
    switch (token) {
      case 'USDT':
        if (network === 'ETH' || network === 'BSC') return TOKEN_CONTRACTS.USDT_ETH
        if (network === 'TRX') return TOKEN_CONTRACTS.USDT_TRX
        break
      case 'USDC':
        if (network === 'ETH' || network === 'BSC') return TOKEN_CONTRACTS.USDC_ETH
        break
    }
    return null
  }
}

// Lazy-loaded client to avoid requiring API key at module load time
let _nowNodesClient: NowNodesClient | null = null

export function getNowNodesClient(): NowNodesClient {
  if (!_nowNodesClient) {
    _nowNodesClient = new NowNodesClient()
  }
  return _nowNodesClient
}

export const nowNodesClient = getNowNodesClient()
