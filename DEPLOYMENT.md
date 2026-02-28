# Symphony-AION Deployment Guide

Complete guide for deploying Symphony-AION to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Production Build](#production-build)
4. [Docker Deployment](#docker-deployment)
5. [Vercel Deployment](#vercel-deployment)
6. [Environment Configuration](#environment-configuration)
7. [Database Setup](#database-setup)
8. [Monitoring & Logs](#monitoring--logs)
9. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

- **Node.js**: 18.17+ or 20+
- **npm**: 9+
- **Git**: Latest version
- **Docker**: 20+ (optional, for containerized deployment)
- **PostgreSQL**: 14+ (production database, optional)
- **Redis**: 6+ (job queue, production only)

---

## Local Development

### 1. Clone Repository

```bash
git clone https://github.com/courtneybtaylor-sys/Symphony-AION.git
cd Symphony-AION
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

Required variables:
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-random-32-char-string>
DATABASE_URL=file:./dev.db
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 4. Initialize Database

```bash
export DATABASE_URL="file:./dev.db"
npx prisma db push
```

### 5. Run Development Server

```bash
npm run dev
```

Access: http://localhost:3000

---

## Production Build

### 1. Build Script

Use the provided build script:

```bash
./scripts/build.sh
```

This will:
- Install dependencies
- Run linter and type checker
- Run full test suite
- Build Next.js application
- Generate optimized production bundle

### 2. Manual Build

```bash
npm run build
npm run start
```

### 3. Build Verification

```bash
# Test production build locally
npm run build
npm run start

# Visit http://localhost:3000 and verify all features
```

---

## Docker Deployment

### 1. Build Docker Image

```bash
docker build -t symphony-aion:latest .
```

### 2. Run Container

```bash
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://user:password@postgres:5432/symphony_aion" \
  -e NEXTAUTH_URL="https://yourdomain.com" \
  -e NEXTAUTH_SECRET="<secret>" \
  symphony-aion:latest
```

### 3. Docker Compose (Development)

```bash
docker-compose up
```

Includes:
- Next.js application
- PostgreSQL database (optional, commented out)
- Redis (optional, commented out)

---

## Vercel Deployment

### 1. Connect Repository

```bash
npm install -g vercel
vercel link
```

### 2. Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```env
DATABASE_URL=postgresql://user:password@db-host/symphony_aion
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=<random-32-char-string>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Deploy

```bash
vercel deploy --prod
```

Or enable automatic deployments:
- Push to `main` branch
- Vercel automatically builds and deploys

### 4. Custom Domain

In Vercel Dashboard → Settings → Domains:
1. Add custom domain
2. Update DNS records
3. Verify domain ownership

---

## Environment Configuration

### Required Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Essential for Next.js optimization |
| `NEXTAUTH_URL` | `https://yourdomain.com` | Must match deployment URL |
| `NEXTAUTH_SECRET` | 32+ char random string | Generate: `openssl rand -base64 32` |
| `DATABASE_URL` | PostgreSQL connection string | Format: `postgresql://user:pass@host:5432/db` |

### Optional Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `STRIPE_SECRET_KEY` | - | Stripe payments (test mode if unset) |
| `STRIPE_WEBHOOK_SECRET` | - | Stripe webhook verification |
| `REDIS_URL` | - | Redis for job queue (production) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | API endpoint for frontend |
| `NEXT_PUBLIC_LOG_LEVEL` | `info` | Logging level |

---

## Database Setup

### PostgreSQL (Production)

#### Local PostgreSQL

```bash
# Install PostgreSQL
brew install postgresql@16  # macOS
# or
sudo apt-get install postgresql  # Ubuntu

# Start service
brew services start postgresql@16  # macOS
# or
sudo systemctl start postgresql  # Ubuntu

# Create database and user
createuser symphony_aion
createdb -O symphony_aion symphony_aion

# Set password
psql -U symphony_aion -d symphony_aion -c "ALTER USER symphony_aion WITH PASSWORD 'secure_password';"
```

#### Cloud PostgreSQL

**Neon** (recommended):
```bash
# Create database on neon.tech
# Copy connection string:
postgresql://username:password@ep-xxxxx.us-east-1.neon.tech/symphony_aion
```

**AWS RDS**:
```bash
# Create RDS instance
# Copy endpoint:
postgresql://user:password@symphony-aion.xxxxx.us-east-1.rds.amazonaws.com:5432/symphony_aion
```

#### Run Migrations

```bash
export DATABASE_URL="postgresql://user:password@host:5432/symphony_aion"
npx prisma db push
npx prisma generate
```

### SQLite (Development Only)

```bash
export DATABASE_URL="file:./dev.db"
npx prisma db push
```

---

## Monitoring & Logs

### Application Logs

```bash
# Vercel
vercel logs

# Docker
docker logs <container_id>

# Local
npm run start 2>&1 | tee app.log
```

### Key Metrics to Monitor

- **Error Rate**: Should be < 1%
- **Response Time**: P95 < 500ms
- **Database Connection Pool**: Monitor utilization
- **Job Queue**: Monitor pending and failed jobs
- **Disk Space**: Ensure adequate storage for logs and database

### Error Tracking (Optional)

Integrate with error tracking service:

```typescript
// examples/sentry.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

---

## Rollback Procedures

### Vercel Rollback

1. Go to Vercel Dashboard → Deployments
2. Find previous successful deployment
3. Click → Promote to Production
4. Verify deployment is active

### Docker Rollback

```bash
# List image tags
docker images symphony-aion

# Stop current container
docker stop <container_id>

# Run previous version
docker run -d --name symphony-aion-prod \
  --restart=always \
  -p 3000:3000 \
  symphony-aion:previous-tag
```

### Database Rollback

```bash
# List migrations
npx prisma migrate status

# Rollback to previous migration
npx prisma migrate resolve --rolled-back "migration_name"

# Reapply
npx prisma migrate deploy
```

---

## Maintenance

### Regular Tasks

- **Weekly**: Check logs for errors
- **Monthly**: Review security updates, patch Node.js
- **Quarterly**: Performance review, database optimization
- **Annually**: Dependency audit, security audit

### Health Checks

```bash
# API health
curl https://yourdomain.com/api/health

# Database connection
npm run prisma:validate

# Tests
npm test
```

### Security Checklist

- [ ] Environment variables are secure
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] Rate limiting active
- [ ] Webhook signatures verified
- [ ] Database backups automated
- [ ] SSL certificates valid and renewed

---

## Support

For deployment issues:

1. Check logs: `vercel logs` or `docker logs`
2. Verify environment variables
3. Test database connection: `npx prisma db execute --stdin < query.sql`
4. Open issue: https://github.com/courtneybtaylor-sys/Symphony-AION/issues

---

**Last Updated**: February 28, 2026 | **Version**: 2.0.0
