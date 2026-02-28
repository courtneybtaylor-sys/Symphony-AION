# Symphony-AION: Enterprise Readiness Roadmap

## Overview

This document consolidates the comprehensive code review recommendations with the detailed finish-line prompts into a single, actionable roadmap for transforming Symphony-AION from MVP to enterprise-grade production system.

**Current Status**: Phase 3 Complete (164 tests passing, all core features implemented)
**Next Phase**: Phase 4 – Production Hardening (4–6 weeks)
**Goal**: Enterprise-ready, fully authenticated, database-backed, scalable platform

---

## Phase Breakdown & Mapping

### Phase 1–3: Completed ✅
- Core AEI scoring engine
- PDF report generation
- Stripe payment integration (test mode)
- Webhook handling
- 8 recommendation rules
- Real telemetry integration (4 fixtures, 27 tests)
- **Test Coverage**: 164 tests
- **Total LOC**: ~4,615 (lib + api + tests)

### Phase 4: Production Hardening (This Phase – 4–6 weeks)

This phase focuses on **security, reliability, and data persistence**. It directly implements prompts 1–8 from the finish-line prompts.

#### Phase 4a: Authentication & Authorization (Week 1–1.5)
**Prompts**: Prompt 1

- [ ] Install NextAuth.js + Prisma adapter
- [ ] Create user schema (email, password hash)
- [ ] Implement /login and /signup pages
- [ ] Protect all API routes with getSession() checks
- [ ] Add logout functionality
- [ ] Write auth flow tests
- [ ] Verify 401 responses for unauthenticated requests

**Acceptance Criteria**:
- Users can register and log in
- Unauthenticated API calls return 401
- Dashboard shows only authenticated user's data
- All tests pass

**Estimated Effort**: 5 days
**Dependencies**: None

---

#### Phase 4b: Database Setup (Week 1.5–3)
**Prompts**: Prompt 2

- [ ] Install Prisma + PostgreSQL client
- [ ] Set up PostgreSQL instance (local or cloud)
- [ ] Define Prisma schema (users, uploads, audit_jobs, analytics_events, accounts)
- [ ] Create migrations
- [ ] Add database indexes (user_id, created_at, status, token expiry)
- [ ] Update all API routes to use database instead of mock data
- [ ] Remove/archive MOCK_RUNS and mock data
- [ ] Update environment variables for DB connection

**Database Schema**:
```prisma
model User {
  id       String   @id @default(cuid())
  email    String   @unique
  password String?
  subscriptionTier String @default("free")
  createdAt DateTime @default(now())
  uploads  Upload[]
  auditJobs AuditJob[]

  @@index([email])
}

model Upload {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  telemetry       Json
  hash            String   @unique
  framework       String?
  modelCount      Int?
  totalCostUSD    Decimal?
  createdAt       DateTime @default(now())
  auditJob        AuditJob?

  @@index([userId])
  @@index([createdAt])
}

model AuditJob {
  id                    String   @id @default(cuid())
  uploadId              String   @unique
  upload                Upload   @relation(fields: [uploadId], references: [id])
  userId                String
  user                  User     @relation(fields: [userId], references: [id])
  stripeSessionId       String?  @unique
  status                String   @default("queued") // queued, processing, complete, failed
  aeiScore              Decimal?
  reportToken           String?  @unique
  reportTokenExpiresAt  DateTime?
  reportFilePath        String?
  createdAt             DateTime @default(now())
  completedAt           DateTime?

  @@index([userId])
  @@index([status])
  @@index([reportTokenExpiresAt])
}

model AnalyticsEvent {
  id        BigInt   @id @default(autoincrement())
  userId    String?
  eventType String
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([createdAt])
  @@index([userId, eventType])
}
```

**Acceptance Criteria**:
- PostgreSQL schema applied via migrations
- All API routes query database
- Runs/uploads persist across restarts
- Indexes created for performance
- Tests use test database (SQLite or separate PostgreSQL instance)

**Estimated Effort**: 10 days
**Dependencies**: Phase 4a (authentication) – optional but recommended to have users

---

#### Phase 4c: Background Job Queue (Week 3–3.5)
**Prompts**: Prompt 3

- [ ] Install Bull + ioredis
- [ ] Set up Redis instance (local or cloud)
- [ ] Create lib/queue.ts for Bull queue setup
- [ ] Modify /api/webhook to queue jobs instead of calling processAuditJob directly
- [ ] Create workers/audit-worker.ts that processes jobs
- [ ] Implement exponential backoff retries (3 attempts)
- [ ] Update job status in database (queued → processing → complete/failed)
- [ ] Add error logging and failure handling
- [ ] Optional: Create job status endpoint

**Key Changes**:
```typescript
// Before: webhook handler calls processAuditJob synchronously (10–30s)
const pdfBlob = await generateAuditReport(...);
return NextResponse.json(result);

// After: webhook handler queues job and returns immediately (<100ms)
await auditQueue.add({ uploadId, userId }, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 }
});
return NextResponse.json({ queued: true });

// Separate worker process handles PDF generation
auditQueue.process(async (job) => {
  const { uploadId, userId } = job.data;
  // Generate PDF, send email, update DB
  // Can take 10–30s without blocking webhook
});
```

**Acceptance Criteria**:
- Webhook returns 200 within 500ms
- PDF generation runs asynchronously
- Job failures are retried 3 times with backoff
- Job status visible in database
- No timeouts on production-scale telemetry

**Estimated Effort**: 5 days
**Dependencies**: Phase 4b (database – to store job status)

---

#### Phase 4d: Rate Limiting (Week 3.5–4)
**Prompts**: Prompt 4

- [ ] Install @upstash/ratelimit or express-rate-limit
- [ ] Create middleware.ts with rate limiting logic
- [ ] Define limits:
  - Upload endpoint: 100 requests/hour per IP
  - Checkout endpoint: 50 requests/hour per IP
  - Download endpoint: 1000 requests/hour per IP
  - Read endpoints: 1000 requests/hour per IP
- [ ] Return 429 status when exceeded
- [ ] Add RateLimit headers to responses
- [ ] Test rate limiting

**Acceptance Criteria**:
- Requests are rejected after limit exceeded
- 429 status code + RateLimit headers returned
- Rate limits are per-IP (distributed if using Upstash)

**Estimated Effort**: 3 days
**Dependencies**: None (works with or without auth/DB)

---

#### Phase 4e: Input Validation with Zod (Week 4)
**Prompts**: Prompt 5

- [ ] Install zod
- [ ] Create lib/validation/schemas.ts with schemas for all endpoints
- [ ] Update API routes to validate request bodies
- [ ] Return 400 with error details for invalid input
- [ ] Write validation tests

**Schemas Needed**:
```typescript
// Upload telemetry
TelemetryUploadSchema

// Checkout request
CheckoutRequestSchema

// Download request (query params)
DownloadRequestSchema

// Webhook event (Stripe)
StripeEventSchema (optional – Stripe SDK validates)
```

**Acceptance Criteria**:
- Malformed requests return 400 with validation errors
- Valid requests pass through
- All tests pass

**Estimated Effort**: 3 days
**Dependencies**: None (can run in parallel with other phases)

---

#### Phase 4f: Stripe Webhook Signature Verification (Week 4)
**Prompts**: Prompt 6

- [ ] Import Stripe SDK
- [ ] Modify /api/webhook to verify signature using stripe.webhooks.constructEvent
- [ ] Add STRIPE_WEBHOOK_SECRET to environment
- [ ] Return 401 if verification fails
- [ ] Test with Stripe CLI

**Acceptance Criteria**:
- Valid Stripe webhooks are accepted
- Invalid signatures return 401
- Stripe CLI test events work

**Estimated Effort**: 2 days
**Dependencies**: None

---

#### Phase 4g: Secure Download Token Validation (Week 4)
**Prompts**: Prompt 7

- [ ] Update /api/download-report to query database for token
- [ ] Check token expiry against reportTokenExpiresAt
- [ ] Return 401 if invalid or expired
- [ ] Log download event to analytics

**Acceptance Criteria**:
- Valid tokens work; expired tokens rejected
- Random tokens return 401
- Download events logged

**Estimated Effort**: 2 days
**Dependencies**: Phase 4b (database)

---

#### Phase 4h: CORS Headers (Week 4)
**Prompts**: Prompt 8

- [ ] Add CORS middleware or headers
- [ ] Configure allowed origins (localhost for dev, your domain for prod)
- [ ] Set appropriate Allow-Methods and Allow-Headers
- [ ] Handle OPTIONS preflight requests
- [ ] Test cross-origin requests

**Acceptance Criteria**:
- Cross-origin requests work from allowed origins
- Disallowed origins are rejected (or limited based on config)

**Estimated Effort**: 1 day
**Dependencies**: None

---

### Phase 4 Summary

| Prompt | Task | Week | Days | Dependencies |
|--------|------|------|------|--------------|
| 1 | Authentication (NextAuth) | 1–1.5 | 5 | None |
| 2 | Database (PostgreSQL + Prisma) | 1.5–3 | 10 | Auth (optional) |
| 3 | Job Queue (Bull + Redis) | 3–3.5 | 5 | DB |
| 4 | Rate Limiting | 3.5–4 | 3 | None |
| 5 | Zod Input Validation | 4 | 3 | None |
| 6 | Webhook Signature Verification | 4 | 2 | None |
| 7 | Secure Token Validation | 4 | 2 | DB |
| 8 | CORS Headers | 4 | 1 | None |

**Total Estimated Effort**: 31 days (4.5–5 weeks)
**Critical Path**: Auth → DB → Job Queue (sequential)
**Parallelizable**: Rate Limiting, Zod, Webhook Signature, CORS (once DB is done)

---

### Phase 4.5: Performance Optimization (2 weeks – Optional for MVP, Recommended for Scale)

**Prompts**: Not explicitly in finish-line list, but covered in code review

- [ ] **Single-pass event aggregation** (Prompt 9)
  - Refactor buildRunViewModel() to aggregate all event data in one loop
  - 4x faster for large event streams
  - Effort: 3 days
  - Dependency: None

- [ ] **Redis caching layer**
  - Cache frequently accessed runs (5–10 min TTL)
  - Cache admin stats (1 hour TTL)
  - Effort: 3 days
  - Dependency: Redis (added in Phase 4c)

- [ ] **Database query optimization**
  - Add database indexes (already in Phase 4b schema)
  - Use database aggregations for admin stats instead of in-app calculations
  - Effort: 2 days
  - Dependency: Database

- [ ] **PDF generation worker**
  - Move PDF generation to separate process (not needed if using job queue)
  - Effort: 1 day (optional)

**Estimated Effort for Phase 4.5**: 9 days (roughly 1.5 weeks)

---

### Phase 5: Maintainability & Testing (2 weeks)

**Prompts**: 10, 11, 12, plus Final Prompt

#### Phase 5a: Refactor Recommendations Engine (Week 1)
**Prompt 10**

- [ ] Create lib/recommendations/rules/ directory
- [ ] Split each of 8 rules into separate files
- [ ] Define RuleFunction type and use in index.ts
- [ ] Update tests for new structure
- [ ] Verify rule discovery and execution

**Acceptance Criteria**:
- Each rule is independently testable
- Adding new rules doesn't require modifying core logic
- All tests pass

**Estimated Effort**: 3 days

---

#### Phase 5b: Comprehensive Test Suite (Week 1–2)
**Prompt 11**

- [ ] Add authentication tests (login, signup, session, logout)
- [ ] Add database tests (CRUD operations, indexes, migrations)
- [ ] Add job queue tests (job creation, processing, retry, failure)
- [ ] Add rate limiting tests (limit exceeded, headers)
- [ ] Add validation tests (Zod schemas)
- [ ] Add webhook signature tests
- [ ] Add integration tests (end-to-end flows)

**Target**: 250+ tests (164 existing + 90+ new)

**Acceptance Criteria**:
- All tests pass
- Coverage for new features >80%
- CI/CD runs tests on push

**Estimated Effort**: 5 days

---

#### Phase 5c: Documentation (Week 2)
**Prompt 12**

- [ ] Update README.md with:
  - Authentication setup
  - Database setup (PostgreSQL)
  - Redis/Bull setup
  - Rate limiting info
  - Environment variables
- [ ] Create docs/ARCHITECTURE.md
- [ ] Create docs/API.md with all endpoint documentation
- [ ] Create docs/DEPLOYMENT.md (Vercel, AWS, Railway)
- [ ] Add JSDoc comments to all exported functions
- [ ] Add inline comments for complex algorithms
- [ ] Create docs/TROUBLESHOOTING.md

**Acceptance Criteria**:
- Documentation is complete and accurate
- New developers can set up environment from README
- All API endpoints documented with examples

**Estimated Effort**: 4 days

---

### Phase 5 Summary

| Task | Days | Week |
|------|------|------|
| Refactor Recommendations | 3 | 1 |
| Comprehensive Tests | 5 | 1–2 |
| Documentation | 4 | 2 |
| **Total** | **12 days** | **2 weeks** |

---

### Phase 6: Launch & Deployment (1 week – Final Prompt)

- [ ] Run all tests (npm test)
- [ ] Run linter (npm run lint) and fix issues
- [ ] Build production bundle (npm run build)
- [ ] Create release branch (release/v2.0.0)
- [ ] Write release notes
- [ ] Tag release (v2.0.0)
- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Merge to main
- [ ] Deploy to production

**Acceptance Criteria**:
- All tests pass
- Production build succeeds
- Staging environment fully functional
- No errors in logs

**Estimated Effort**: 3–5 days

---

## Complete Timeline

```
Phase 4:   Production Hardening        [4.5–5 weeks]  ← You are here
├─ 4a: Auth                            [0.5 week]
├─ 4b: Database                        [1.5 weeks]
├─ 4c: Job Queue                       [0.5 week]
├─ 4d–4h: Security & Validation        [1 week]
└─ 4.5: Performance Optimization       [1–1.5 weeks, optional]

Phase 5:   Maintainability & Testing   [2 weeks]
├─ 5a: Refactor Recommendations        [3 days]
├─ 5b: Test Suite                      [5 days]
└─ 5c: Documentation                   [4 days]

Phase 6:   Launch & Deployment         [1 week]
└─ Release v2.0.0 (Enterprise Ready)

Total Duration: 7–8 weeks
```

---

## Environment Variables Required

### Phase 4 Additions

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/symphony_aion
DATABASE_URL_TEST=postgresql://user:password@localhost:5432/symphony_aion_test

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random 32+ char string>

# Redis
REDIS_URL=redis://localhost:6379

# Job Queue
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Rate Limiting
RATELIMIT_ENABLED=true

# CORS
FRONTEND_URL=http://localhost:3000
```

---

## Success Metrics

### Phase 4 Exit Criteria

- [ ] 100% of API routes require authentication (401 on missing session)
- [ ] All data persists in PostgreSQL across restarts
- [ ] PDF generation doesn't block webhook (all PDFs generated asynchronously)
- [ ] Rate limiting in place (100+ requests rejected)
- [ ] All API inputs validated with Zod (no 400 without detailed error)
- [ ] Stripe webhooks verified (0 spoofed events accepted)
- [ ] Download tokens expire (24h limit enforced)
- [ ] CORS headers present (no mixed-origin errors)
- [ ] 100% test pass rate (190+ tests)
- [ ] Production build succeeds (npm run build)
- [ ] Zero TypeScript errors (strict mode)
- [ ] Zero ESLint errors (npm run lint)

### Phase 5 Exit Criteria

- [ ] Each recommendation rule independently testable
- [ ] 250+ tests passing (80%+ coverage on new code)
- [ ] Full API documentation with examples
- [ ] Deployment documentation complete
- [ ] New developers can set up from README in <30 minutes
- [ ] All exported functions have JSDoc
- [ ] Complex algorithms have inline comments

### Phase 6 Exit Criteria

- [ ] Staging environment fully functional (upload → audit → download)
- [ ] No errors in production logs
- [ ] Released as v2.0.0
- [ ] Main branch reflects current state

---

## How to Use This Document

### For Next Session

1. **Start with Phase 4a** (Authentication):
   ```bash
   # Prompt for next session:
   "Implement Prompt 1 from ENTERPRISE_ROADMAP.md: Add authentication with NextAuth.js"
   ```

2. **After completing 4a**:
   ```bash
   # Prompt for next session:
   "Implement Prompt 2 from ENTERPRISE_ROADMAP.md: Set up PostgreSQL with Prisma"
   ```

3. **Continue in order** (or jump to critical path):
   - Critical path: 4a → 4b → 4c (sequential)
   - Parallel work: 4d, 4e, 4f, 4g, 4h (after 4a, 4b dependencies met)

### Customization

- **Fast track**: Skip Phase 4.5 (performance) if not needed for scale
- **Slow track**: Extend Phase 4 to 8 weeks if doing deeper code reviews
- **MVP only**: Use Phase 4a–4b only (auth + DB) as minimum viable production

---

## Rollback Plan

If any phase fails:

1. **Phase 4a fails** → Keep mock auth, continue with DB
2. **Phase 4b fails** → Keep in-memory mock data, but add Redis caching for reads
3. **Phase 4c fails** → Keep synchronous PDF generation (accept webhook timeout risk)
4. **4d–4h fail** → Add these incrementally post-launch

---

## Questions to Answer Before Starting

- [ ] Which database hosting? (Local, Neon, Supabase, AWS RDS)
- [ ] Which Redis hosting? (Local, Upstash, AWS ElastiCache)
- [ ] OAuth or email/password only? (Add Google OAuth in 4a if needed)
- [ ] Stripe test mode only, or switch to production? (Phase 6)
- [ ] Deploy to Vercel, AWS, Railway, or self-hosted? (Phase 6)

---

## Related Documents

- **Code Review Report**: `/root/.claude/projects/.../review-report.md` (comprehensive analysis)
- **README.md**: Current project documentation
- **Tests**: `tests/`, `__tests__/` directories
- **Prisma Schema**: `prisma/schema.prisma` (Phase 4b)
- **Environment Template**: `.env.example`

---

**Last Updated**: February 28, 2026
**Author**: Claude Code Review
**Status**: Ready for Phase 4 Implementation
