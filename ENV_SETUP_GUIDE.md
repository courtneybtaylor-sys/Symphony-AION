# Environment Setup Guide

## Overview

Symphony-AION uses environment variables to configure different deployment scenarios:
- **Demo Mode** - Development/testing without database
- **Development** - Local development with full stack
- **Production** - Cloud deployment with managed services

## File Structure

```
.env.example          ← Template with all available variables
.env.local           ← Your local configuration (git ignored)
.env.production      ← Production configuration (not in this repo)
.env.test            ← Test configuration (optional)
```

## Setup Instructions

### 1. Create Local Environment File

```bash
cp .env.example .env.local
```

### 2. Choose Your Setup

#### Option A: Demo Mode (Recommended for First-Time Setup)

For quick testing without database setup:

```bash
# .env.local
NEXT_PUBLIC_DEMO_MODE=true
```

Then run:
```bash
npm run dev
```

The app is immediately accessible at `http://localhost:3000` with admin access.

See `DEMO_MODE_SETUP.md` for details.

#### Option B: Development with Local Database

For full development with local PostgreSQL:

```bash
# .env.local
NEXT_PUBLIC_DEMO_MODE=false

# PostgreSQL connection (local)
DATABASE_URL=postgresql://postgres:password@localhost:5432/symphony_aion

# NextAuth configuration
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# IR-Parser backend (optional)
IR_PARSER_URL=http://localhost:8000

# Redis for job queue (optional)
REDIS_URL=redis://localhost:6379/0
```

Prerequisites:
- PostgreSQL running locally
- `prisma generate` executed (see below)
- Optional: Redis running locally

#### Option C: Development with Cloud Database

For development using Neon or AWS RDS:

```bash
# .env.local
DATABASE_URL=postgresql://user:password@neon.dev:5432/symphony_aion

# Rest of configuration same as Option B
```

### 3. Generate Prisma Client

If using a database, generate the Prisma client:

```bash
npm run prisma:generate
```

Or let the postinstall script handle it:
```bash
npm install
```

### 4. Initialize Database (If Needed)

```bash
npx prisma migrate deploy
```

### 5. Start Development Server

```bash
npm run dev
```

## Environment Variables Reference

### Demo Mode

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_DEMO_MODE` | No | `false` | Enable authentication bypass for development |

### Database (Phase 4b)

| Variable | Required | Value |
|----------|----------|-------|
| `DATABASE_URL` | Yes (if not demo mode) | `postgresql://user:pass@host/db` |

### Authentication (Phase 4a)

| Variable | Required | How to Generate |
|----------|----------|-----------------|
| `NEXTAUTH_SECRET` | Yes (if not demo mode) | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes (if not demo mode) | Your app domain (e.g., `http://localhost:3000`) |

### Admin Security (Phase 4g)

| Variable | Required | Description |
|----------|----------|-------------|
| `ADMIN_SECRET` | No | Secret key for admin endpoints |

### Job Queue (Phase 4c)

| Variable | Required | Value |
|----------|----------|-------|
| `REDIS_URL` | No | `redis://localhost:6379/0` (for Bull queue) |

### Backend Integration (Phase 5)

| Variable | Required | Value |
|----------|----------|-------|
| `IR_PARSER_URL` | No | `http://localhost:8000` (FastAPI backend) |

### Payments (Phase 4f)

| Variable | Required | How to Get |
|----------|----------|-----------|
| `STRIPE_SECRET_KEY` | No | [Stripe Dashboard](https://dashboard.stripe.com) |
| `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` | No | [Stripe Dashboard](https://dashboard.stripe.com) |
| `STRIPE_WEBHOOK_SECRET` | No | [Stripe Webhooks](https://dashboard.stripe.com/webhooks) |

## Common Configurations

### Quick Development Setup

```bash
# Minimal development - demo mode with optional backend
NEXT_PUBLIC_DEMO_MODE=true
IR_PARSER_URL=http://localhost:8000
```

### Full Development Stack

```bash
# Complete development environment
DATABASE_URL=postgresql://postgres:password@localhost:5432/symphony_aion
NEXTAUTH_SECRET=dev-secret-key-change-in-production
NEXTAUTH_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379/0
IR_PARSER_URL=http://localhost:8000
```

### Production (Vercel)

```bash
# Vercel deployment with cloud services
DATABASE_URL=postgresql://user@neon.dev/db?sslmode=require
NEXTAUTH_SECRET=<generate-new>
NEXTAUTH_URL=https://yourdomain.com
STRIPE_SECRET_KEY=sk_live_...
IR_PARSER_URL=https://backend.yourdomain.com
REDIS_URL=<upstash-url>
```

## Validation

To verify your environment setup:

```bash
# Check that required variables are set
npm run env:check

# Run tests to validate configuration
npm run test:env
```

## Troubleshooting

### "DATABASE_URL is not set" error

**Solution**:
1. Add `DATABASE_URL` to `.env.local`, OR
2. Enable demo mode: `NEXT_PUBLIC_DEMO_MODE=true`

### "NEXTAUTH_SECRET is not set" error

**Solution**:
1. Add `NEXTAUTH_SECRET` to `.env.local`:
   ```bash
   NEXTAUTH_SECRET=$(openssl rand -base64 32)
   ```
2. Or enable demo mode: `NEXT_PUBLIC_DEMO_MODE=true`

### ".prisma/client not found" error

**Solution**:
1. Run: `npm install`
2. This will trigger the postinstall script to generate the Prisma client

### "Cannot connect to database" error

**Solution**:
1. Verify `DATABASE_URL` is correct
2. Test connection with: `npx prisma db push`
3. For cloud databases, ensure firewall allows your IP

### "IR-Parser connection refused" error

**Solution**:
1. IR-Parser is optional - app works without it
2. To test IR-Parser, ensure FastAPI backend is running:
   ```bash
   cd symphony-aion/backend
   python -m uvicorn main:app --reload --port 8000
   ```

## Security Notes

### Do NOT commit .env.local

The `.env.local` file contains secrets and should NEVER be committed to git.

### Generate strong secrets

For production, always generate new secrets:

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Environment variable precedence

Variables are loaded in this order:
1. `.env.local` (highest priority - local overrides)
2. `.env` (if `.env.local` doesn't exist)
3. System environment variables
4. `.env.example` (not used, just reference)

## Next Steps

1. **Choose your setup** - Demo mode for quick start, or full stack
2. **Copy and edit** - `cp .env.example .env.local`
3. **Set variables** - Add required values for your chosen setup
4. **Start dev server** - `npm run dev`
5. **Test** - Visit `http://localhost:3000`

For deployment instructions, see `DEPLOYMENT.md`.
