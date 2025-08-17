import nodemailer from 'nodemailer'
import { prisma } from './prisma'
import crypto from 'crypto'

interface EmailConfig {
  host: string
  port: number
  user: string
  pass: string
}

class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    const config: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass
      }
    })
  }

  // Generate verification token
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  // Create verification record
  private async createVerificationRecord(userId: string, type: 'email' | 'password_reset'): Promise<string> {
    const token = this.generateToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await prisma.verificationToken.create({
      data: {
        identifier: userId,
        token,
        type,
        expires: expiresAt
      }
    })

    return token
  }

  // Send email verification
  async sendVerificationEmail(userId: string, email: string, name: string): Promise<boolean> {
    try {
      const token = await this.createVerificationRecord(userId, 'email')
      const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify?token=${token}`

      const mailOptions = {
        from: `"FundPath" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Verify your FundPath account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Welcome to FundPath!</h2>
            <p>Hi ${name},</p>
            <p>Thank you for signing up for FundPath. To complete your registration, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            
            <p>This link will expire in 24 hours.</p>
            
            <p>If you didn't create a FundPath account, you can safely ignore this email.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">
              FundPath - Secure crypto payment forwarding without fund holding
            </p>
          </div>
        `
      }

      await this.transporter.sendMail(mailOptions)
      return true
    } catch (error) {
      console.error('Error sending verification email:', error)
      return false
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(userId: string, email: string, name: string): Promise<boolean> {
    try {
      const token = await this.createVerificationRecord(userId, 'password_reset')
      const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`

      const mailOptions = {
        from: `"FundPath" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Reset your FundPath password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Password Reset Request</h2>
            <p>Hi ${name},</p>
            <p>We received a request to reset your FundPath password. Click the button below to create a new password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            
            <p>This link will expire in 24 hours.</p>
            
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">
              FundPath - Secure crypto payment forwarding without fund holding
            </p>
          </div>
        `
      }

      await this.transporter.sendMail(mailOptions)
      return true
    } catch (error) {
      console.error('Error sending password reset email:', error)
      return false
    }
  }

  // Verify token
  async verifyToken(token: string, type: 'email' | 'password_reset'): Promise<string | null> {
    try {
      const verificationToken = await prisma.verificationToken.findFirst({
        where: {
          token,
          type,
          expires: {
            gt: new Date()
          }
        }
      })

      if (!verificationToken) {
        return null
      }

      // Delete the token after use
      await prisma.verificationToken.delete({
        where: { id: verificationToken.id }
      })

      return verificationToken.identifier
    } catch (error) {
      console.error('Error verifying token:', error)
      return null
    }
  }

  // Resend verification email
  async resendVerificationEmail(email: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      })

      if (!user || user.emailVerified) {
        return false
      }

      // Delete any existing verification tokens
      await prisma.verificationToken.deleteMany({
        where: {
          identifier: user.id,
          type: 'email'
        }
      })

      return await this.sendVerificationEmail(user.id, user.email, user.name)
    } catch (error) {
      console.error('Error resending verification email:', error)
      return false
    }
  }
}

export const emailService = new EmailService()
