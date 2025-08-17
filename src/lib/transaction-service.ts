import { prisma } from './prisma'
import { nowNodesClient } from './now-nodes'
import { walletService, GeneratedWallet } from './wallet-service'
import { TransactionStatus } from '@prisma/client'
import { PlatformFeeService } from './platform-fee-service'

export interface CreateTransactionRequest {
  merchantId: string
  network: string
  token?: string
  amount: string
  amountUsd?: number
  customerPaysFee: boolean
  merchantWalletAddress: string
}

export interface CreateTransactionResponse {
  transactionId: string
  tempWalletAddress: string
  amount: string
  feeAmount: string
  totalAmount: string
  expiresAt: Date
  network: string
  token?: string
  qrCode?: string
}

export class TransactionService {
  /**
   * Create a new transaction with temporary wallet
   */
  async createTransaction(request: CreateTransactionRequest): Promise<CreateTransactionResponse> {
    const {
      merchantId,
      network,
      token,
      amount,
      amountUsd,
      customerPaysFee,
      merchantWalletAddress
    } = request

    // Validate merchant wallet address
    if (!walletService.validateAddress(merchantWalletAddress, network as any)) {
      throw new Error(`Invalid ${network} address: ${merchantWalletAddress}`)
    }

    // Get merchant's network preferences
    const networkPreference = await prisma.networkPreference.findUnique({
      where: {
        merchantId_network: {
          merchantId,
          network
        }
      }
    })

    if (!networkPreference || !networkPreference.isEnabled) {
      throw new Error(`Network ${network} is not enabled for this merchant`)
    }

    // Generate temporary wallet
    const tempWallet = await walletService.generateWallet(network as any)

    // Calculate fees using platform fee service
    const feeCalculation = await PlatformFeeService.calculateFeeRate({
      network,
      token: token || network,
      amount: parseFloat(amount),
      gasPrice: undefined // Will be determined by the platform
    })
    
    const feeAmount = feeCalculation.feeAmount.toString()
    
    // Use provided customerPaysFee or fall back to network preference
    const finalCustomerPaysFee = customerPaysFee !== undefined 
      ? customerPaysFee 
      : networkPreference.customerPaysFee
    
    const totalAmount = finalCustomerPaysFee 
      ? (BigInt(amount) + BigInt(feeAmount)).toString()
      : amount

    // Set expiration time (3 hours from now)
    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000)

    // Get confirmation requirements
    const requiredConfirmations = nowNodesClient.getConfirmationRequirements(network as any)

    // Create transaction in database
    const transaction = await prisma.transaction.create({
      data: {
        merchantId,
        network,
        token,
        amount,
        amountUsd,
        customerPaysFee: finalCustomerPaysFee,
        feeAmount,
        feeAmountUsd: amountUsd ? (amountUsd * feeCalculation.feeRate) : null,
        tempWalletAddress: tempWallet.address,
        merchantWalletAddress,
        status: 'PENDING',
        requiredConfirmations,
        expiresAt,
        metadata: {
          tempWalletPrivateKey: tempWallet.privateKey, // In production, encrypt this
          tempWalletPublicKey: tempWallet.publicKey,
          networkDisplayName: walletService.getNetworkDisplayName(network as any),
          networkSymbol: walletService.getNetworkSymbol(network as any)
        }
      }
    })

    // Generate QR code for the payment address
    const qrCode = this.generateQRCode(tempWallet.address, totalAmount, network)

    return {
      transactionId: transaction.id,
      tempWalletAddress: tempWallet.address,
      amount,
      feeAmount,
      totalAmount,
      expiresAt,
      network,
      token,
      qrCode
    }
  }

  /**
   * Check payment status for a transaction
   */
  async checkPaymentStatus(transactionId: string): Promise<{
    status: TransactionStatus
    transaction: any
    paymentInfo?: any
  }> {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        merchant: true
      }
    })

    if (!transaction) {
      throw new Error('Transaction not found')
    }

    // If already completed, return current status
    if (transaction.status === 'COMPLETED' || transaction.status === 'FAILED') {
      return {
        status: transaction.status,
        transaction
      }
    }

    // Check if transaction has expired
    if (transaction.expiresAt < new Date() && transaction.status === 'PENDING') {
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'EXPIRED' }
      })
      return {
        status: 'EXPIRED',
        transaction: { ...transaction, status: 'EXPIRED' }
      }
    }

    // Check payment status via NOW Nodes
    try {
      const tokenAddress = transaction.token 
        ? nowNodesClient.getTokenContractAddress(transaction.token, transaction.network as any)
        : undefined

      const paymentStatus = await nowNodesClient.checkPayment(
        transaction.network as any,
        transaction.tempWalletAddress,
        transaction.amount,
        tokenAddress
      )

      // Update transaction if payment is detected
      if (paymentStatus.paid && paymentStatus.confirmations! >= transaction.requiredConfirmations) {
        if (transaction.status === 'PENDING') {
          await prisma.transaction.update({
            where: { id: transactionId },
            data: {
              status: 'PAID',
              confirmations: paymentStatus.confirmations,
              paidAt: new Date(),
              metadata: {
                ...transaction.metadata,
                balance: paymentStatus.balance,
                lastChecked: new Date().toISOString()
              }
            }
          })

          // Trigger fund forwarding
          await this.forwardFunds(transactionId)
        }
      } else if (paymentStatus.confirmations! > 0) {
        // Update confirmations even if not fully paid
        await prisma.transaction.update({
          where: { id: transactionId },
          data: {
            confirmations: paymentStatus.confirmations,
            metadata: {
              ...transaction.metadata,
              balance: paymentStatus.balance,
              lastChecked: new Date().toISOString()
            }
          }
        })
      }

      return {
        status: transaction.status,
        transaction,
        paymentInfo: paymentStatus
      }
    } catch (error) {
      console.error(`Error checking payment status for transaction ${transactionId}:`, error)
      return {
        status: transaction.status,
        transaction
      }
    }
  }

  /**
   * Forward funds to merchant wallet
   */
  private async forwardFunds(transactionId: string): Promise<void> {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: {
          merchant: true
        }
      })

      if (!transaction || transaction.status !== 'PAID') {
        return
      }

      // Update status to FORWARDING
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'FORWARDING' }
      })

      console.log(`Starting fund forwarding for transaction ${transactionId}`)

      // TODO: Implement actual fund forwarding logic
      // This would involve:
      // 1. Getting the private key from transaction.metadata.tempWalletPrivateKey
      // 2. Creating and signing a transaction to the merchant's wallet
      // 3. Broadcasting the transaction via NOW Nodes
      // 4. Updating the transaction with the outgoing hash

      // For now, we'll simulate successful forwarding
      await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'COMPLETED',
          outgoingTxHash: `simulated_${Date.now()}`,
          forwardedAt: new Date()
        }
      })

      console.log(`Transaction ${transactionId} completed successfully`)

      // Send webhook notification to merchant if configured
      await this.sendMerchantWebhook(transaction)

    } catch (error) {
      console.error(`Error forwarding funds for transaction ${transactionId}:`, error)
      
      // Update status to FAILED
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { 
          status: 'FAILED',
          metadata: {
            ...transaction?.metadata,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })
    }
  }

  /**
   * Send webhook notification to merchant
   */
  private async sendMerchantWebhook(transaction: any, apiKey?: any): Promise<void> {
    try {
      // If no API key provided, try to find one with webhooks enabled
      let webhookConfig = apiKey
      if (!webhookConfig) {
        webhookConfig = await prisma.apiKey.findFirst({
          where: {
            merchantId: transaction.merchantId,
            webhookEnabled: true,
            isActive: true
          }
        })
      }

      if (!webhookConfig || !webhookConfig.webhookEnabled || !webhookConfig.webhookUrl) {
        return
      }

      const webhookData = {
        event: 'transaction_completed',
        transactionId: transaction.id,
        status: 'COMPLETED',
        amount: transaction.amount,
        network: transaction.network,
        token: transaction.token,
        incomingTxHash: transaction.incomingTxHash,
        outgoingTxHash: transaction.outgoingTxHash,
        timestamp: new Date().toISOString()
      }

      const response = await fetch(webhookConfig.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': this.generateWebhookSignature(webhookData, webhookConfig.webhookSecret || webhookConfig.key)
        },
        body: JSON.stringify(webhookData)
      })

      if (!response.ok) {
        console.error(`Failed to send webhook to merchant: ${response.status}`)
      }
    } catch (error) {
      console.error('Error sending merchant webhook:', error)
    }
  }

  /**
   * Generate webhook signature for merchant
   */
  private generateWebhookSignature(data: any, apiKey: string): string {
    const crypto = require('crypto')
    const payload = JSON.stringify(data)
    return crypto
      .createHmac('sha256', apiKey)
      .update(payload)
      .digest('hex')
  }

  /**
   * Generate QR code for payment
   */
  private generateQRCode(address: string, amount: string, network: string): string {
    // Generate payment URI based on network
    let paymentUri = ''
    
    switch (network) {
      case 'BTC':
        paymentUri = `bitcoin:${address}?amount=${walletService.convertFromSmallestUnit(amount, network as any)}`
        break
      case 'ETH':
      case 'BSC':
        paymentUri = `ethereum:${address}?value=${amount}`
        break
      case 'TRX':
        paymentUri = `tron:${address}?amount=${walletService.convertFromSmallestUnit(amount, network as any)}`
        break
      case 'SOL':
        paymentUri = `solana:${address}?amount=${walletService.convertFromSmallestUnit(amount, network as any)}`
        break
      case 'TON':
        paymentUri = `ton:${address}?amount=${walletService.convertFromSmallestUnit(amount, network as any)}`
        break
      default:
        paymentUri = address
    }

    // In a real implementation, you would generate an actual QR code image
    // For now, return the payment URI
    return paymentUri
  }

  /**
   * Get merchant transactions with filtering
   */
  async getMerchantTransactions(
    merchantId: string,
    options: {
      status?: TransactionStatus
      network?: string
      limit?: number
      offset?: number
    } = {}
  ) {
    const { status, network, limit = 50, offset = 0 } = options

    const where: any = { merchantId }
    if (status) where.status = status
    if (network) where.network = network

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        merchant: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    const total = await prisma.transaction.count({ where })

    return {
      transactions,
      total,
      limit,
      offset
    }
  }

  /**
   * Clean up expired transactions
   */
  async cleanupExpiredTransactions(): Promise<number> {
    const result = await prisma.transaction.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          lt: new Date()
        }
      },
      data: {
        status: 'EXPIRED'
      }
    })

    return result.count
  }

  /**
   * Retry failed transactions
   */
  async retryFailedTransaction(transactionId: string): Promise<void> {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    })

    if (!transaction || transaction.status !== 'FAILED') {
      throw new Error('Transaction not found or not in failed status')
    }

    if (transaction.retryCount >= transaction.maxRetries) {
      throw new Error('Maximum retry attempts reached')
    }

    // Reset status and increment retry count
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'PAID', // Reset to PAID to trigger forwarding again
        retryCount: transaction.retryCount + 1,
        lastRetryAt: new Date()
      }
    })

    // Trigger fund forwarding again
    await this.forwardFunds(transactionId)
  }
}

export const transactionService = new TransactionService()
