import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function initializePlatformFees() {
  console.log('Initializing platform fees...')

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
    try {
      await prisma.platformFee.upsert({
        where: {
          network_token: {
            network: fee.network,
            token: fee.token
          }
        },
        update: {
          baseFeeRate: fee.baseFeeRate,
          gasFeeMultiplier: fee.gasFeeMultiplier,
          minFeeRate: 0.5,
          maxFeeRate: 1.0,
          isActive: true
        },
        create: {
          network: fee.network,
          token: fee.token,
          baseFeeRate: fee.baseFeeRate,
          gasFeeMultiplier: fee.gasFeeMultiplier,
          minFeeRate: 0.5,
          maxFeeRate: 1.0,
          isActive: true
        }
      })
      console.log(`✅ Initialized fees for ${fee.network}/${fee.token}`)
    } catch (error) {
      console.error(`❌ Failed to initialize fees for ${fee.network}/${fee.token}:`, error)
    }
  }

  console.log('Platform fees initialization completed!')
}

async function main() {
  try {
    await initializePlatformFees()
  } catch (error) {
    console.error('Error initializing platform fees:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
