import Bull from 'bull'
import { emailService } from './email'

// Email queue configuration
const emailQueue = new Bull('email-queue', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
})

// Email job types
export interface EmailJobData {
  type: 'verification' | 'password-reset' | 'notification'
  userId: string
  email: string
  name: string
  token?: string
  subject?: string
  content?: string
}

// Process email jobs
emailQueue.process(async (job) => {
  const { type, userId, email, name, token, subject, content } = job.data as EmailJobData

  try {
    let emailSent = false

    switch (type) {
      case 'verification':
        emailSent = await emailService.sendVerificationEmail(userId, email, name)
        break
      case 'password-reset':
        if (token) {
          emailSent = await emailService.sendPasswordResetEmail(userId, email, name, token)
        }
        break
      case 'notification':
        if (subject && content) {
          emailSent = await emailService.sendNotificationEmail(email, name, subject, content)
        }
        break
      default:
        throw new Error(`Unknown email type: ${type}`)
    }

    if (!emailSent) {
      throw new Error(`Failed to send ${type} email to ${email}`)
    }

    console.log(`Email sent successfully: ${type} to ${email}`)
    return { success: true, email, type }

  } catch (error) {
    console.error(`Email job failed: ${type} to ${email}`, error)
    throw error
  }
})

// Queue event handlers
emailQueue.on('completed', (job, result) => {
  console.log(`Email job completed: ${job.data.type} to ${job.data.email}`)
})

emailQueue.on('failed', (job, err) => {
  console.error(`Email job failed: ${job.data.type} to ${job.data.email}`, err)
})

emailQueue.on('error', (error) => {
  console.error('Email queue error:', error)
})

// Email queue service
export class EmailQueueService {
  static async addVerificationEmail(userId: string, email: string, name: string) {
    return emailQueue.add('verification', {
      type: 'verification',
      userId,
      email,
      name,
    }, {
      priority: 1,
      delay: 0,
    })
  }

  static async addPasswordResetEmail(userId: string, email: string, name: string, token: string) {
    return emailQueue.add('password-reset', {
      type: 'password-reset',
      userId,
      email,
      name,
      token,
    }, {
      priority: 2,
      delay: 0,
    })
  }

  static async addNotificationEmail(email: string, name: string, subject: string, content: string) {
    return emailQueue.add('notification', {
      type: 'notification',
      userId: '',
      email,
      name,
      subject,
      content,
    }, {
      priority: 3,
      delay: 0,
    })
  }

  static async getQueueStatus() {
    const waiting = await emailQueue.getWaiting()
    const active = await emailQueue.getActive()
    const completed = await emailQueue.getCompleted()
    const failed = await emailQueue.getFailed()

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    }
  }

  static async clearQueue() {
    await emailQueue.empty()
  }

  static async close() {
    await emailQueue.close()
  }
}

export { emailQueue }
