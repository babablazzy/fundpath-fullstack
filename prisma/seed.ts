import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12)
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@fundpath.com' },
    update: {},
    create: {
             email: 'admin@fundpath.com',
       password: hashedPassword,
       name: 'System Admin',
       role: 'ADMIN',
       isActive: true,
       emailVerified: new Date(),
      admin: {
        create: {
          permissions: ['manage_merchants', 'manage_transactions', 'manage_fees', 'view_analytics']
        }
      }
    }
  })

  console.log('✅ Admin user created:', adminUser.email)

  // Create system configurations
  const systemConfigs = [
    { key: 'default_fee_rate', value: '0.5' },
    { key: 'max_retry_attempts', value: '3' },
    { key: 'transaction_expiry_hours', value: '3' },
    { key: 'user_expiry_minutes', value: '30' },
    { key: 'bitcoin_confirmations', value: '1' },
    { key: 'ethereum_confirmations', value: '12' },
    { key: 'solana_confirmations', value: '32' },
    { key: 'ton_confirmations', value: '1' },
    { key: 'bsc_confirmations', value: '15' },
    { key: 'tron_confirmations', value: '19' }
  ]

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config
    })
  }

  console.log('✅ System configurations created')

  // Create sample merchant (for testing)
  const merchantUser = await prisma.user.upsert({
    where: { email: 'merchant@example.com' },
    update: {},
    create: {
             email: 'merchant@example.com',
       password: await bcrypt.hash('merchant123', 12),
       name: 'Sample Merchant',
       role: 'MERCHANT',
       isActive: true,
       emailVerified: new Date(),
      merchant: {
        create: {
          websiteUrl: 'https://example.com',
          expectedTurnover: 'below_10k',
          apiKey: 'sample_api_key_123',
          webhookUrl: 'https://example.com/webhook',
          isApproved: true
        }
      }
    }
  })

  console.log('✅ Sample merchant created:', merchantUser.email)

  // Create sample wallets for the merchant
  const merchant = await prisma.merchant.findUnique({
    where: { userId: merchantUser.id }
  })

  if (merchant) {
    const sampleWallets = [
      { network: 'bitcoin', address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' },
      { network: 'ethereum', address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6' },
      { network: 'solana', address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM' },
      { network: 'ton', address: 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t' },
      { network: 'bsc', address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6' },
      { network: 'tron', address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' }
    ]

    for (const wallet of sampleWallets) {
      await prisma.wallet.upsert({
        where: { merchantId_network: { merchantId: merchant.id, network: wallet.network } },
        update: { address: wallet.address },
        create: {
          merchantId: merchant.id,
          network: wallet.network,
          address: wallet.address,
          isActive: true
        }
      })
    }

    console.log('✅ Sample wallets created')

    // Create network preferences
    const networkPreferences = [
      { network: 'bitcoin', isEnabled: true, feeRate: 0.5, customerPaysFee: false },
      { network: 'ethereum', isEnabled: true, feeRate: 0.5, customerPaysFee: false },
      { network: 'solana', isEnabled: true, feeRate: 0.5, customerPaysFee: false },
      { network: 'ton', isEnabled: true, feeRate: 0.5, customerPaysFee: false },
      { network: 'bsc', isEnabled: true, feeRate: 0.5, customerPaysFee: false },
      { network: 'tron', isEnabled: true, feeRate: 0.5, customerPaysFee: false }
    ]

    for (const pref of networkPreferences) {
      await prisma.networkPreference.upsert({
        where: { merchantId_network: { merchantId: merchant.id, network: pref.network } },
        update: pref,
        create: {
          merchantId: merchant.id,
          ...pref
        }
      })
    }

    console.log('✅ Network preferences created')
  }

  console.log('🎉 Database seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
