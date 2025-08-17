import { prisma } from '../src/lib/prisma'

async function cleanupExpiredTransactions() {
  try {
    console.log('Starting expired transaction cleanup...')
    
    // Find expired transactions that are still pending
    const expiredTransactions = await prisma.transaction.findMany({
      where: {
        expiresAt: { lt: new Date() },
        status: 'PENDING'
      },
      select: {
        id: true,
        amount: true,
        network: true,
        createdAt: true,
        expiresAt: true
      }
    })

    console.log(`Found ${expiredTransactions.length} expired transactions`)

    if (expiredTransactions.length > 0) {
      // Update expired transactions
      const result = await prisma.transaction.updateMany({
        where: {
          expiresAt: { lt: new Date() },
          status: 'PENDING'
        },
        data: { 
          status: 'EXPIRED',
          updatedAt: new Date()
        }
      })

      console.log(`Updated ${result.count} transactions to EXPIRED status`)

      // Log the expired transactions
      for (const transaction of expiredTransactions) {
        console.log(`Expired: ${transaction.id} - ${transaction.amount} on ${transaction.network}`)
      }
    }

    // Also clean up very old transactions (older than 30 days) regardless of status
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const oldTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        status: { in: ['EXPIRED', 'FAILED'] }
      },
      select: {
        id: true,
        status: true,
        createdAt: true
      }
    })

    console.log(`Found ${oldTransactions.length} old transactions to archive`)

    if (oldTransactions.length > 0) {
      // Delete old transactions (older than 30 days)
      const deleteResult = await prisma.transaction.deleteMany({
        where: {
          createdAt: { lt: thirtyDaysAgo },
          status: { in: ['EXPIRED', 'FAILED'] }
        }
      })

      console.log(`Deleted ${deleteResult.count} old transactions`)
    }

    console.log('Cleanup completed successfully')
    
  } catch (error) {
    console.error('Error during cleanup:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  cleanupExpiredTransactions()
}

export { cleanupExpiredTransactions }
