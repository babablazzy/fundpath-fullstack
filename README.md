# FundPath Crypto Forwarder

A secure crypto payment gateway that automatically forwards payments to merchant wallets without holding funds.

## Features

### For Merchants
- **Multi-network Support**: Bitcoin, Ethereum, Solana, TON, BSC, Tron, and ERC-20 tokens
- **Automatic Forwarding**: Funds are forwarded immediately upon payment confirmation
- **No Fund Holding**: We never hold merchant funds
- **Flexible Fee Structure**: Choose who pays fees (customer or merchant)
- **Real-time Notifications**: Webhook support for payment events
- **Transaction Management**: Complete transaction history and analytics
- **API Integration**: RESTful API for seamless integration

### For Admins
- **Merchant Management**: Approve/reject merchant applications
- **Transaction Monitoring**: Real-time transaction tracking
- **Fee Management**: Configure fee rates per network
- **System Health**: Monitor system performance and failed transactions
- **2FA Security**: Enhanced security for admin accounts

## Architecture

### Tech Stack
- **Frontend**: Next.js 14 with App Router
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **Blockchain**: NOW Nodes API
- **Styling**: Tailwind CSS

### Core Components
1. **Transaction Service**: Handles payment processing and fund forwarding
2. **NOW Nodes Client**: Blockchain operations and wallet management
3. **Authentication System**: Secure merchant and admin access
4. **Webhook System**: Real-time payment notifications
5. **Dashboard**: Merchant and admin interfaces

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
Copy `env.example` to `.env` and configure:

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
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed initial data
npx prisma db seed
```

### 4. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

## API Documentation

### Authentication
All API endpoints require authentication via NextAuth.js session.

### Create Transaction
```http
POST /api/transactions/create
Content-Type: application/json

{
  "network": "bitcoin",
  "token": "USDT", // optional
  "amount": "1000000", // in smallest unit (satoshi, wei, etc.)
  "amountUsd": 50.00, // optional
  "customerPaysFee": true,
  "merchantWalletAddress": "bc1q..."
}
```

### Check Transaction Status
```http
GET /api/transactions/{id}/status
```

### List Transactions
```http
GET /api/transactions?status=COMPLETED&network=bitcoin&limit=50&offset=0
```

### Webhook Endpoint
```http
POST /api/webhooks/now-nodes
```

## Transaction Flow

1. **Merchant creates transaction** → Temporary wallet is generated
2. **Customer pays** → Funds sent to temporary wallet
3. **Payment detected** → System checks confirmations
4. **Funds forwarded** → Automatic transfer to merchant wallet
5. **Webhook notification** → Merchant notified of completion

## Security Features

- **2FA for Admins**: Enhanced security for administrative access
- **API Key Authentication**: Secure merchant API access
- **Webhook Verification**: Signed webhook payloads
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Comprehensive request validation
- **SQL Injection Protection**: Prisma ORM with parameterized queries

## Network Support

| Network | Confirmations | Native Token | ERC-20 Support |
|---------|---------------|--------------|----------------|
| Bitcoin | 1-2 | BTC | No |
| Ethereum | 12-15 | ETH | Yes |
| Solana | 32 | SOL | Yes |
| TON | 1-2 | TON | Yes |
| BSC | 15-20 | BNB | Yes |
| Tron | 19 | TRX | Yes |

## Fee Structure

- **Default Fee**: 0.5% per transaction
- **Flexible Payment**: Customer or merchant can pay fees
- **Network-specific**: Configurable per network
- **Transparent**: Clear fee breakdown in all transactions

## Deployment

### VPS Deployment
1. Set up Linux server with Node.js and PostgreSQL
2. Configure environment variables
3. Run database migrations
4. Build and start the application
5. Set up reverse proxy (Nginx)
6. Configure SSL certificates

### Environment Variables for Production
```bash
NODE_ENV=production
DATABASE_URL="your-production-database-url"
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-production-secret"
NOW_NODES_API_KEY="your-production-api-key"
```

## Monitoring and Maintenance

### Automated Tasks
- **Expired Transaction Cleanup**: Runs every hour
- **Failed Transaction Retry**: Automatic retry with exponential backoff
- **Webhook Delivery**: Retry failed webhook notifications

### Manual Tasks
- **Database Backups**: Regular PostgreSQL backups
- **Log Monitoring**: Monitor application and error logs
- **Performance Monitoring**: Track API response times and throughput

## Support

For technical support or questions:
- Check the documentation
- Review the API endpoints
- Monitor system logs
- Contact the development team

## License

This project is proprietary software. All rights reserved.


The seed file will create:
Admin user: admin@fundpath.com / admin123
Sample merchant: merchant@example.com / merchant123
Sample wallets and network preferences for testing