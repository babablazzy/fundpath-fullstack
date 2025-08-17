# FundPath Crypto Forwarder - Technical Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Current Implementation](#current-implementation)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Setup Instructions](#setup-instructions)
7. [Usage Guide](#usage-guide)
8. [Planned Features](#planned-features)
9. [Development Roadmap](#development-roadmap)
10. [Troubleshooting](#troubleshooting)

## Project Overview

FundPath is a crypto payment gateway that automatically forwards payments to merchant wallets without holding funds. The system creates temporary wallets for each transaction, monitors payments, and forwards funds immediately upon confirmation.

### Key Features
- **No Fund Holding**: We never hold merchant funds
- **Multi-Network Support**: Bitcoin, Ethereum, Solana, TON, BSC, Tron
- **Automatic Forwarding**: Funds forwarded immediately after confirmation
- **Flexible Fee Structure**: Customer or merchant can pay fees
- **Real-time Notifications**: Webhook support for payment events
- **Merchant Dashboard**: Complete transaction management interface

## Current Implementation

### ✅ Completed Features

#### 1. Core Infrastructure
- **Next.js 14** with App Router setup
- **PostgreSQL** database with Prisma ORM
- **NextAuth.js** authentication system
- **Tailwind CSS** for styling
- **TypeScript** for type safety

#### 2. Database Schema
- **Users**: Admin and merchant user management
- **Merchants**: Merchant profiles and settings
- **Wallets**: Merchant wallet addresses per network
- **Transactions**: Complete transaction tracking
- **Network Preferences**: Per-network fee and settings
- **System Config**: Global system configurations

#### 3. Authentication System
- **Role-based access**: Admin and Merchant roles
- **2FA support**: Enhanced security for admin accounts
- **Session management**: JWT-based sessions
- **Password hashing**: bcrypt for secure password storage

#### 4. API Endpoints
- `POST /api/transactions/create` - Create new payment transactions
- `GET /api/transactions/[id]/status` - Check transaction status
- `GET /api/transactions` - List merchant transactions
- `POST /api/webhooks/now-nodes` - Webhook endpoint for payments

#### 5. Core Services
- **TransactionService**: Payment processing and fund forwarding
- **NowNodesClient**: Complete NOW Nodes API integration with all supported networks
- **EmailService**: Email verification and password reset functionality
- **Database Operations**: Complete CRUD operations

#### 6. Frontend Components
- **Landing Page**: Marketing page with features
- **Merchant Dashboard**: Transaction overview and management
- **Authentication Pages**: Complete authentication flow (sign in, sign up, email verification, password reset)

#### 7. Database Seeding
- **Admin User**: `admin@fundpath.com` / `admin123`
- **Sample Merchant**: `merchant@example.com` / `merchant123`
- **Sample Wallets**: Test wallet addresses for all networks
- **Network Preferences**: Default settings for all networks

## Architecture

### Tech Stack
```
Frontend: Next.js 14 + TypeScript + Tailwind CSS
Backend: Next.js API Routes + Prisma ORM
Database: PostgreSQL (Neon)
Authentication: NextAuth.js
Blockchain: NOW Nodes API (to be integrated)
```

### File Structure
```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── transactions/
│   │   │   ├── create/route.ts
│   │   │   ├── [id]/status/route.ts
│   │   │   └── route.ts
│   │   └── webhooks/now-nodes/route.ts
│   ├── dashboard/page.tsx
│   └── page.tsx
├── lib/
│   ├── auth.ts
│   ├── now-nodes.ts
│   ├── prisma.ts
│   └── transaction-service.ts
└── types/
```

## Database Schema

### Core Tables

#### Users
```sql
- id: String (CUID)
- email: String (unique)
- password: String (hashed)
- name: String
- role: UserRole (ADMIN/MERCHANT)
- isActive: Boolean
- twoFactorSecret: String?
- twoFactorEnabled: Boolean
- createdAt: DateTime
- updatedAt: DateTime
```

#### Merchants
```sql
- id: String (CUID)
- userId: String (foreign key)
- websiteUrl: String
- expectedTurnover: String
- apiKey: String (unique)
- webhookUrl: String?
- isApproved: Boolean
- createdAt: DateTime
- updatedAt: DateTime
```

#### Transactions
```sql
- id: String (CUID)
- merchantId: String (foreign key)
- network: String
- token: String?
- amount: String
- amountUsd: Float?
- customerPaysFee: Boolean
- feeAmount: String
- feeAmountUsd: Float?
- tempWalletAddress: String
- merchantWalletAddress: String
- status: TransactionStatus
- confirmations: Int
- requiredConfirmations: Int
- incomingTxHash: String?
- outgoingTxHash: String?
- expiresAt: DateTime
- paidAt: DateTime?
- forwardedAt: DateTime?
- retryCount: Int
- maxRetries: Int
- lastRetryAt: DateTime?
- metadata: Json?
- createdAt: DateTime
- updatedAt: DateTime
```

#### Wallets
```sql
- id: String (CUID)
- merchantId: String (foreign key)
- network: String
- address: String
- isActive: Boolean
- createdAt: DateTime
- updatedAt: DateTime
```

#### Network Preferences
```sql
- id: String (CUID)
- merchantId: String (foreign key)
- network: String
- isEnabled: Boolean
- feeRate: Float
- customerPaysFee: Boolean
- createdAt: DateTime
- updatedAt: DateTime
```

## NOW Nodes Integration

### Overview
The project integrates with NOW Nodes API to provide blockchain connectivity for multiple networks. NOW Nodes provides both full node RPC endpoints and explorer (Blockbook) endpoints for real-time blockchain data.

### Supported Networks
- **Bitcoin (BTC)**: Full node and Blockbook explorer
- **Ethereum (ETH)**: Full node and Blockbook explorer  
- **Binance Smart Chain (BSC)**: Full node and Blockbook explorer
- **Tron (TRX)**: Full node and Blockbook explorer
- **Toncoin (TON)**: Full node and Indexer
- **Solana (SOL)**: Full node RPC

### Token Support
- **USDT**: ERC-20 (Ethereum), TRC-20 (Tron)
- **USDC**: ERC-20 (Ethereum), SPL (Solana)

### Key Features
- **Address Monitoring**: Real-time payment detection via polling and webhooks
- **Transaction Broadcasting**: Secure fund forwarding to merchant wallets
- **Multi-Network Support**: Unified API for all supported blockchains
- **Webhook Processing**: Automatic payment status updates
- **Signature Verification**: Secure webhook validation

### Configuration
```env
NOWNODES_API_KEY=your_api_key_here
NOWNODES_WEBHOOK_SECRET=your_webhook_secret_here
```

### API Endpoints

### Authentication Required Endpoints

#### Create Transaction
```http
POST /api/transactions/create
Content-Type: application/json
Authorization: Bearer <session_token>

{
  "network": "bitcoin",
  "token": "USDT", // optional
  "amount": "1000000", // in smallest unit
  "amountUsd": 50.00, // optional
  "customerPaysFee": true,
  "merchantWalletAddress": "bc1q..."
}

Response:
{
  "transactionId": "clx...",
  "tempWalletAddress": "bc1q...",
  "amount": "1000000",
  "feeAmount": "5000",
  "totalAmount": "1005000",
  "expiresAt": "2024-01-01T12:30:00Z",
  "network": "bitcoin",
  "token": null
}
```

#### Check Transaction Status
```http
GET /api/transactions/{id}/status
Authorization: Bearer <session_token>

Response:
{
  "status": "PENDING",
  "transaction": {
    // full transaction object
  }
}
```

#### List Transactions
```http
GET /api/transactions?status=COMPLETED&network=bitcoin&limit=50&offset=0
Authorization: Bearer <session_token>

Response:
[
  {
    "id": "clx...",
    "network": "bitcoin",
    "amount": "1000000",
    "status": "COMPLETED",
    // ... other fields
  }
]
```

### Webhook Endpoint

#### NOW Nodes Webhook
```http
POST /api/webhooks/now-nodes
Content-Type: application/json

{
  "event": "payment_received",
  "transaction_hash": "abc...",
  "address": "bc1q...",
  "network": "bitcoin",
  "amount": "1000000"
}

Response:
{
  "success": true
}
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon recommended)
- NOW Nodes API account

### 1. Clone and Install
```bash
git clone <repository-url>
cd fundpath-fn
npm install
```

### 2. Environment Configuration
```bash
cp env.example .env
```

Edit `.env` with your values:
```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/fundpath"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# NOW Nodes API
NOW_NODES_API_KEY="your-now-nodes-api-key"
NOW_NODES_BASE_URL="https://api.nownodes.com/v1"

# Email (for notifications)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

### 3. Database Setup
```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed
```

### 4. Start Development
```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

## Usage Guide

### For Merchants

#### 1. Account Setup
1. Sign up for a merchant account
2. Provide website URL and expected turnover
3. Add wallet addresses for supported networks
4. Configure network preferences and fee settings
5. Wait for admin approval

#### 2. Creating Transactions
```javascript
// Example API call
const response = await fetch('/api/transactions/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionToken}`
  },
  body: JSON.stringify({
    network: 'bitcoin',
    amount: '1000000', // 0.01 BTC in satoshis
    amountUsd: 500.00,
    customerPaysFee: true,
    merchantWalletAddress: 'bc1q...'
  })
});

const transaction = await response.json();
console.log('Payment address:', transaction.tempWalletAddress);
```

#### 3. Monitoring Transactions
```javascript
// Check transaction status
const statusResponse = await fetch(`/api/transactions/${transactionId}/status`);
const status = await statusResponse.json();

// List all transactions
const transactionsResponse = await fetch('/api/transactions?limit=50');
const transactions = await transactionsResponse.json();
```

#### 4. Webhook Integration
Configure your webhook URL to receive real-time notifications:
```json
{
  "event": "completed",
  "transactionId": "clx...",
  "status": "COMPLETED",
  "amount": "1000000",
  "network": "bitcoin",
  "timestamp": "2024-01-01T12:30:00Z"
}
```

### For Admins

#### 1. Admin Access
- Login: `admin@fundpath.com`
- Password: `admin123`

#### 2. Merchant Management
- Approve/reject merchant applications
- Monitor transaction activity
- Manage fee rates and system settings

## Planned Features

### 🔄 In Progress

#### 1. Authentication Pages
- [ ] Sign in page with 2FA support
- [ ] Sign up page for merchants
- [ ] Password reset functionality
- [ ] Email verification

#### 2. Merchant Dashboard Enhancements
- [ ] Transaction creation modal
- [ ] Wallet management interface
- [ ] Network preferences configuration
- [ ] Analytics and reporting
- [ ] Export functionality

#### 3. Admin Dashboard
- [ ] Merchant approval interface
- [ ] Transaction monitoring
- [ ] System health dashboard
- [ ] Fee management interface

### 📋 Planned

#### 1. NOW Nodes Integration
- [ ] Real API integration (pending documentation)
- [ ] Webhook signature verification
- [ ] Transaction monitoring and polling
- [ ] Error handling and retry logic

#### 2. Enhanced Security
- [ ] Rate limiting implementation
- [ ] API key authentication
- [ ] IP whitelisting for admin
- [ ] Audit logging

#### 3. Advanced Features
- [ ] Multi-currency support
- [ ] Advanced analytics
- [ ] Mobile app
- [ ] API documentation (Swagger)
- [ ] Webhook testing interface

#### 4. Operational Features
- [ ] Automated cleanup jobs
- [ ] Email notifications
- [ ] Failed transaction retry system
- [ ] System monitoring and alerts

## Development Roadmap

### Phase 1: Core Authentication (Week 1)
- [ ] Implement sign in/sign up pages
- [ ] Add password reset functionality
- [ ] Implement 2FA for admin accounts
- [ ] Add email verification

### Phase 2: Merchant Dashboard (Week 2)
- [ ] Complete transaction creation interface
- [ ] Add wallet management
- [ ] Implement network preferences
- [ ] Add transaction filtering and search

### Phase 3: Admin Features (Week 3)
- [ ] Build admin dashboard
- [ ] Add merchant approval system
- [ ] Implement transaction monitoring
- [ ] Add system configuration interface

### Phase 4: NOW Nodes Integration (Week 4)
- [ ] Integrate real NOW Nodes API
- [ ] Implement webhook verification
- [ ] Add transaction polling
- [ ] Test with real transactions

### Phase 5: Production Readiness (Week 5)
- [ ] Add comprehensive error handling
- [ ] Implement rate limiting
- [ ] Add monitoring and logging
- [ ] Performance optimization

### Phase 6: Advanced Features (Week 6+)
- [ ] Analytics and reporting
- [ ] Mobile responsiveness
- [ ] API documentation
- [ ] Advanced security features

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check if database is accessible
npx prisma db pull

# Reset database
npx prisma migrate reset

# Regenerate Prisma client
npx prisma generate
```

#### Authentication Issues
```bash
# Clear NextAuth sessions
# Check NEXTAUTH_SECRET is set correctly
# Verify DATABASE_URL is correct
```

#### NOW Nodes API Issues
```bash
# Check API key is valid
# Verify base URL is correct
# Test API endpoints manually
```

#### Build Issues
```bash
# Clear Next.js cache
rm -rf .next
npm run build

# Check TypeScript errors
npx tsc --noEmit
```

### Environment Variables Checklist
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `NEXTAUTH_URL` - Application URL
- [ ] `NEXTAUTH_SECRET` - Random secret for JWT
- [ ] `NOW_NODES_API_KEY` - NOW Nodes API key
- [ ] `NOW_NODES_BASE_URL` - NOW Nodes API base URL
- [ ] `SMTP_HOST` - Email server host
- [ ] `SMTP_PORT` - Email server port
- [ ] `SMTP_USER` - Email username
- [ ] `SMTP_PASS` - Email password

### Performance Optimization
- [ ] Database indexing on frequently queried fields
- [ ] API response caching
- [ ] Image optimization
- [ ] Code splitting
- [ ] Bundle analysis

### Security Checklist
- [ ] Environment variables not committed to git
- [ ] HTTPS in production
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (Prisma handles this)
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Secure headers

## Support and Maintenance

### Regular Maintenance Tasks
1. **Database Backups**: Daily automated backups
2. **Log Monitoring**: Monitor application and error logs
3. **Performance Monitoring**: Track API response times
4. **Security Updates**: Keep dependencies updated
5. **Transaction Monitoring**: Monitor failed transactions

### Monitoring Points
- API response times
- Database connection pool usage
- Failed transaction rates
- Webhook delivery success rates
- System resource usage

### Emergency Procedures
1. **Database Issues**: Switch to backup, restore from snapshot
2. **API Issues**: Check NOW Nodes status, implement fallback
3. **Security Breach**: Rotate API keys, audit logs
4. **Performance Issues**: Scale resources, optimize queries

---

**Last Updated**: January 2024
**Version**: 1.0.0
**Status**: Development Phase
