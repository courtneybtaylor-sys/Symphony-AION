# BLOCKERS LOG

## [Task 1] PostgreSQL Migration Database Unavailable

**Status**: Database environment unavailable in test environment  
**Environment**: Linux 4.4.0 (Docker/databases not accessible)  
**Error**: Cannot connect to PostgreSQL at localhost:5432  
**Impact**:
- Cannot run `npx prisma migrate dev` (requires live database)
- Migration files not generated yet
- Tests will fail if trying to use PostgreSQL

**Resolution**:
1. When PostgreSQL is deployed:
   - Start PostgreSQL service: `docker-compose up -d postgres`
   - Wait for healthy status
   - Run: `npx prisma migrate dev --name init_postgresql`
   - Run: `npx prisma generate`
   - Run: `npm test` to verify migrations

2. For this session:
   - Schema changes are committed
   - Migration will be generated when DB available
   - Tests will continue with SQLite fallback temporarily

**Workaround**:
- Manually create migration SQL from Prisma schema
- Or deploy with `prisma migrate deploy` on startup

---

## [Task 2-8] Blocked By Task 1

PostgreSQL connectivity is required for:
- Task 1: Initial migration
- Task 2+: All subsequent tasks depend on DB being ready

Once Task 1 completes successfully, proceed with:
- Task 2: Redis rate limiting
- Task 3: Bull queue + PDF generation
- Task 4: Email (Resend)
- Task 5: Payload size limits
- Task 6: Checkout gating
- Task 7: IR-parser integration
- Task 8: Security hardening

