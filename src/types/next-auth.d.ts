import { UserRole } from '@prisma/client'
import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    email: string
    name: string
    role: UserRole
    merchantId?: string
    adminId?: string
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      merchantId?: string
      adminId?: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: UserRole
    merchantId?: string
    adminId?: string
  }
}
