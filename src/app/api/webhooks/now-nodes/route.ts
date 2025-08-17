import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { nowNodesClient } from '@/lib/now-nodes'
import crypto from 'crypto'

// Webhook signature verification
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-nownodes-signature')
    
    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.NOWNODES_WEBHOOK_SECRET
    if (webhookSecret && signature) {
      if (!verifyWebhookSignature(body, signature, webhookSecret)) {
        console.error('Invalid webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const data = JSON.parse(body)
    console.log('NOW Nodes webhook received:', data)

    // Handle different webhook types based on NOW Nodes documentation
    const webhookType = data.type || 'transaction'
    
    switch (webhookType) {
      case 'transaction':
        await handleTransactionWebhook(data)
        break
      case 'address':
        await handleAddressWebhook(data)
        break
      case 'block':
        await handleBlockWebhook(data)
        break
      default:
        console.log('Unknown webhook type:', webhookType)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleTransactionWebhook(data: any) {
  const {
    network,
    address,
    txid,
    amount,
    confirmations,
    token,
    blockHeight
  } = data

  console.log(`Processing transaction webhook for ${network} address ${address}`)

  // Find pending transaction for this address
  const transaction = await prisma.transaction.findFirst({
    where: {
      tempWalletAddress: address,
      status: 'PENDING',
      expiresAt: {
        gt: new Date()
      }
    },
    include: {
      merchant: true
    }
  })

  if (!transaction) {
    console.log(`No pending transaction found for address ${address}`)
    return
  }

  // Verify the transaction matches our expected amount
  const expectedAmount = transaction.amount
  const receivedAmount = amount.toString()

  if (receivedAmount < expectedAmount) {
    console.log(`Insufficient amount received: ${receivedAmount} < ${expectedAmount}`)
    return
  }

  // Check if we have enough confirmations
  const requiredConfirmations = transaction.requiredConfirmations
  if (confirmations < requiredConfirmations) {
    console.log(`Insufficient confirmations: ${confirmations} < ${requiredConfirmations}`)
    return
  }

  // Update transaction status to PAID
  await prisma.transaction.update({
    where: { id: transaction.id },
    data: {
      status: 'PAID',
      confirmations,
      incomingTxHash: txid,
      paidAt: new Date(),
      metadata: {
        ...transaction.metadata,
        webhookData: data
      }
    }
  })

  console.log(`Transaction ${transaction.id} marked as PAID`)

  // Trigger fund forwarding
  await forwardFunds(transaction.id)
}

async function handleAddressWebhook(data: any) {
  const { network, address, balance, txCount } = data

  console.log(`Processing address webhook for ${network} address ${address}`)

  // Find pending transaction for this address
  const transaction = await prisma.transaction.findFirst({
    where: {
      tempWalletAddress: address,
      status: 'PENDING',
      expiresAt: {
        gt: new Date()
      }
    }
  })

  if (!transaction) {
    console.log(`No pending transaction found for address ${address}`)
    return
  }

  // Use NOW Nodes client to check payment status
  try {
    const tokenAddress = transaction.token 
      ? nowNodesClient.getTokenContractAddress(transaction.token, network as any)
      : undefined

    const paymentStatus = await nowNodesClient.checkPayment(
      network as any,
      address,
      transaction.amount,
      tokenAddress
    )

    if (paymentStatus.paid && paymentStatus.confirmations! >= transaction.requiredConfirmations) {
      // Update transaction status
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'PAID',
          confirmations: paymentStatus.confirmations,
          paidAt: new Date(),
          metadata: {
            ...transaction.metadata,
            webhookData: data,
            balance: paymentStatus.balance
          }
        }
      })

      console.log(`Transaction ${transaction.id} marked as PAID via address webhook`)

      // Trigger fund forwarding
      await forwardFunds(transaction.id)
    }
  } catch (error) {
    console.error(`Error checking payment status for transaction ${transaction.id}:`, error)
  }
}

async function handleBlockWebhook(data: any) {
  const { network, blockHeight, blockHash } = data

  console.log(`Processing block webhook for ${network} block ${blockHeight}`)

  // This could be used to update confirmation counts for pending transactions
  // For now, we'll just log it
  console.log(`New block on ${network}: ${blockHeight}`)
}

async function forwardFunds(transactionId: string) {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        merchant: true
      }
    })

    if (!transaction || transaction.status !== 'PAID') {
      console.log(`Transaction ${transactionId} not ready for forwarding`)
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
    // 1. Getting the private key for the temp wallet address
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

    // TODO: Send webhook notification to merchant if configured
    if (transaction.merchant.webhookUrl) {
      // Send webhook to merchant
      console.log(`Sending webhook to merchant: ${transaction.merchant.webhookUrl}`)
    }

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
