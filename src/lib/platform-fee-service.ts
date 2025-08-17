import { prisma } from '@/lib/prisma'

export interface FeeCalculationParams {
  network: string
  token: string
  amount: number
  gasPrice?: number // Optional gas price for dynamic fee calculation
}

export interface FeeCalculationResult {
  feeRate: number
  feeAmount: number
  feeAmountUsd?: number
  isHighGasFee: boolean
  gasFeeMultiplier: number
}

export class PlatformFeeService {
  /**
   * Calculate the appropriate fee rate for a transaction
   * Platform controls fee rates between 0.5% to 1% based on network conditions
   */
  static async calculateFeeRate(params: FeeCalculationParams): Promise<FeeCalculationResult> {
    const { network, token, amount, gasPrice } = params

    // Get platform fee configuration for this network/token
    let platformFee = await prisma.platformFee.findUnique({
      where: {
        network_token: {
          network,
          token
        }
      }
    })

    // If no platform fee config exists, create a default one
    if (!platformFee) {
      platformFee = await prisma.platformFee.create({
        data: {
          network,
          token,
          baseFeeRate: 0.5,
          gasFeeMultiplier: 1.0,
          minFeeRate: 0.5,
          maxFeeRate: 1.0,
          isActive: true
        }
      })
    }

    // Determine if this is a high gas fee transaction
    const isHighGasFee = this.isHighGasFeeTransaction(network, gasPrice)
    const gasFeeMultiplier = isHighGasFee ? platformFee.gasFeeMultiplier : 1.0

    // Calculate the final fee rate
    let feeRate = platformFee.baseFeeRate * gasFeeMultiplier

    // Ensure fee rate is within bounds
    feeRate = Math.max(platformFee.minFeeRate, Math.min(platformFee.maxFeeRate, feeRate))

    // Calculate fee amount
    const feeAmount = (amount * feeRate) / 100

    return {
      feeRate,
      feeAmount,
      isHighGasFee,
      gasFeeMultiplier
    }
  }

  /**
   * Determine if a transaction has high gas fees
   * This is network-specific logic
   */
  private static isHighGasFeeTransaction(network: string, gasPrice?: number): boolean {
    if (!gasPrice) return false

    // Network-specific gas price thresholds
    const thresholds: { [key: string]: number } = {
      'ETH': 50, // Gwei
      'BSC': 5,  // Gwei
      'TRX': 1000, // TRX energy
      'BTC': 50, // sat/vB
      'SOL': 5000, // lamports
      'TON': 1000000 // nano TON
    }

    const threshold = thresholds[network] || 50
    return gasPrice > threshold
  }

  /**
   * Get platform fee configuration for a network/token
   */
  static async getPlatformFee(network: string, token: string) {
    return await prisma.platformFee.findUnique({
      where: {
        network_token: {
          network,
          token
        }
      }
    })
  }

  /**
   * Update platform fee configuration (admin only)
   */
  static async updatePlatformFee(
    network: string, 
    token: string, 
    config: {
      baseFeeRate?: number
      gasFeeMultiplier?: number
      minFeeRate?: number
      maxFeeRate?: number
      isActive?: boolean
    }
  ) {
    return await prisma.platformFee.upsert({
      where: {
        network_token: {
          network,
          token
        }
      },
      update: config,
      create: {
        network,
        token,
        baseFeeRate: config.baseFeeRate || 0.5,
        gasFeeMultiplier: config.gasFeeMultiplier || 1.0,
        minFeeRate: config.minFeeRate || 0.5,
        maxFeeRate: config.maxFeeRate || 1.0,
        isActive: config.isActive !== undefined ? config.isActive : true
      }
    })
  }

  /**
   * Get all platform fee configurations
   */
  static async getAllPlatformFees() {
    return await prisma.platformFee.findMany({
      orderBy: [
        { network: 'asc' },
        { token: 'asc' }
      ]
    })
  }

  /**
   * Initialize default platform fees for supported networks
   */
  static async initializeDefaultFees() {
    const defaultFees = [
      { network: 'BTC', token: 'BTC', baseFeeRate: 0.5, gasFeeMultiplier: 1.2 },
      { network: 'ETH', token: 'ETH', baseFeeRate: 0.6, gasFeeMultiplier: 1.5 },
      { network: 'BSC', token: 'BNB', baseFeeRate: 0.5, gasFeeMultiplier: 1.1 },
      { network: 'TRX', token: 'TRX', baseFeeRate: 0.5, gasFeeMultiplier: 1.0 },
      { network: 'SOL', token: 'SOL', baseFeeRate: 0.6, gasFeeMultiplier: 1.3 },
      { network: 'TON', token: 'TON', baseFeeRate: 0.5, gasFeeMultiplier: 1.0 },
      { network: 'ETH', token: 'USDT', baseFeeRate: 0.7, gasFeeMultiplier: 1.5 },
      { network: 'BSC', token: 'USDT', baseFeeRate: 0.6, gasFeeMultiplier: 1.2 },
      { network: 'TRX', token: 'USDT', baseFeeRate: 0.5, gasFeeMultiplier: 1.0 }
    ]

    for (const fee of defaultFees) {
      await this.updatePlatformFee(fee.network, fee.token, {
        baseFeeRate: fee.baseFeeRate,
        gasFeeMultiplier: fee.gasFeeMultiplier,
        minFeeRate: 0.5,
        maxFeeRate: 1.0,
        isActive: true
      })
    }
  }
}
