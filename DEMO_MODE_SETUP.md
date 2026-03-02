# Demo Mode Setup Guide

## Quick Start

Demo mode allows you to test the entire Symphony-AION application without requiring a database or authentication setup. This is perfect for development, testing, and demonstrations.

### Enable Demo Mode

Add this to your `.env.local` file:

```bash
NEXT_PUBLIC_DEMO_MODE=true
```

Then restart your dev server:

```bash
npm run dev
# or
pnpm dev
```

## What Demo Mode Provides

When `NEXT_PUBLIC_DEMO_MODE=true`:

1. **Authentication Bypass** - All routes are accessible without login
2. **Demo User Session** - Logged in automatically as `demo@symphony-aion.local`
3. **Admin Privileges** - Demo user has `super_admin` role with full access
4. **No Database Required** - Works without `DATABASE_URL` configuration
5. **Full API Access** - Test all endpoints including IR-Parser integration
6. **Mock Data** - Uses existing mock telemetry and recommendation data

## Environment Setup for Demo Mode

### Minimal Configuration (.env.local)

```bash
# Enable demo mode
NEXT_PUBLIC_DEMO_MODE=true

# Optional: Backend endpoints (for testing integrations)
IR_PARSER_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379/0
```

### What You Don't Need in Demo Mode

- ❌ `DATABASE_URL` - Database not required
- ❌ `NEXTAUTH_SECRET` - Authentication bypassed
- ❌ `STRIPE_SECRET_KEY` - Payments bypassed
- ❌ `ADMIN_SECRET` - Admin routes accessible

## Testing with Demo Mode

### 1. Test Authentication Bypass

All protected routes are now accessible:

```bash
# These will all work without login
curl http://localhost:3000/dashboard
curl http://localhost:3000/api/upload-telemetry
curl http://localhost:3000/api/analyze
```

### 2. Test IR-Parser Integration

If you have the FastAPI backend running:

```bash
# Set the backend URL
IR_PARSER_URL=http://localhost:8000

# Test the analyze endpoint
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"telemetry": {...}}'
```

### 3. Access Dashboard

Simply visit: `http://localhost:3000/dashboard`

The dashboard loads with demo user session and mock data.

## Disabling Demo Mode

When you're ready to implement real authentication:

1. Remove `NEXT_PUBLIC_DEMO_MODE=true` from `.env.local`
2. Set up proper environment variables:
   ```bash
   DATABASE_URL=your_database_url
   NEXTAUTH_SECRET=your_secret_key
   NEXTAUTH_URL=http://localhost:3000
   ```
3. Restart the dev server

## Demo Mode Implementation Details

Demo mode is implemented in:

- `lib/demo-mode.ts` - Configuration and helper functions
- `lib/auth/helpers.ts` - Auth bypass for `requireAuth()` and `getAuthUser()`
- `.env.example` - Environment configuration template

### Demo User Details

```javascript
{
  id: 'demo-user-001',
  email: 'demo@symphony-aion.local',
  name: 'Demo User',
  role: 'super_admin', // Full admin access
  createdAt: 2026-03-01
}
```

## Troubleshooting

### "Authentication required" errors in demo mode

**Problem**: Still seeing authentication errors with `NEXT_PUBLIC_DEMO_MODE=true`

**Solution**: 
1. Verify `NEXT_PUBLIC_DEMO_MODE=true` is in `.env.local` (not `.env`)
2. Restart the dev server - changes to `.env.local` require restart
3. Clear Next.js cache: `rm -rf .next` then `npm run dev`

### Demo user not appearing in session

**Problem**: Session doesn't show demo user email

**Solution**:
1. Check browser console for errors
2. Verify the page is using `getAuthUser()` from `lib/auth/helpers.ts`
3. Demo mode only works on server-side and API routes by default

### IR-Parser returning errors

**Problem**: `/api/analyze` endpoint returns errors in demo mode

**Solution**:
1. IR-Parser backend is optional - it returns mock data if not running
2. To test with real backend, set: `IR_PARSER_URL=http://localhost:8000`
3. Ensure FastAPI backend is running on that port

## Next Steps

When ready to move beyond demo mode:

1. **Set up database** - Configure PostgreSQL or Neon
2. **Configure authentication** - Set NextAuth environment variables
3. **Add admin endpoints** - Set `ADMIN_SECRET` for protected admin routes
4. **Implement Redis** - For background jobs and rate limiting (optional for MVP)
5. **Deploy** - Use Vercel for automatic deployment

See `ENTERPRISE_COMPLETION_PLAN.md` for the full implementation roadmap.
