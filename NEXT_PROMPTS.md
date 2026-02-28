# Symphony-AION: Next Prompts for Claude Code

This file provides ready-to-copy prompts for each phase of enterprise readiness work. Copy the relevant prompt into Claude Code and execute.

---

## Phase 4a: Authentication with NextAuth.js

**Session Goal**: Add user authentication to protect API routes and pages

**Copy this prompt**:

```
Implement Prompt 1 from ENTERPRISE_ROADMAP.md: Add authentication with NextAuth.js.

Specific tasks:
1. Install NextAuth.js and Prisma adapter (npm install next-auth @auth/prisma-adapter)
2. Create app/api/auth/[...nextauth]/route.ts with credentials provider
3. Create Prisma schema (lib/db/schema.prisma) with User and Account models
4. Create /login and /signup pages with authentication forms
5. Protect all API routes by adding getSession() checks
6. Add logout button to dashboard
7. Update dashboard to show only authenticated user's data
8. Write tests for authentication flow

Dependencies:
- prisma/schema.prisma will be created in Phase 4b (use SQLite for now)
- Use NEXTAUTH_SECRET (generate with: openssl rand -base64 32)
- Add NEXTAUTH_URL and NEXTAUTH_SECRET to .env.local

Verification steps:
1. npm run dev
2. Navigate to /login, create a test user
3. Verify you can log in and see dashboard
4. Try accessing /api/upload-telemetry without a session → should return 401
5. Log in, then access /api/upload-telemetry → should work
6. Run npm test to ensure no regressions

Commit message: feat: add authentication with NextAuth.js
```

---

## Phase 4b: Database Setup with PostgreSQL + Prisma

**Session Goal**: Replace in-memory mock data with PostgreSQL persistence

**Copy this prompt**:

```
Implement Prompt 2 from ENTERPRISE_ROADMAP.md: Set up PostgreSQL with Prisma.

Specific tasks:
1. Install Prisma (npm install @prisma/client prisma)
2. Initialize Prisma (npx prisma init)
3. Set DATABASE_URL in .env.local (postgresql://user:password@localhost:5432/symphony_aion)
4. Create Prisma schema in prisma/schema.prisma with models:
   - User (with email, password, subscriptionTier)
   - Upload (with telemetry JSONB, hash, framework, modelCount, totalCostUSD)
   - AuditJob (with status, aeiScore, reportToken, reportTokenExpiresAt, reportFilePath)
   - AnalyticsEvent (with userId, eventType, metadata)
5. Add indexes as specified in ENTERPRISE_ROADMAP.md (user_id, created_at, status, token expiry)
6. Run npx prisma migrate dev --name init
7. Generate Prisma client
8. Update all API routes to use Prisma instead of MOCK_RUNS:
   - GET /api/runs/[id] → fetch from uploads and audit_jobs
   - POST /api/upload-telemetry → create Upload record
   - POST /api/webhook → create AuditJob record
   - GET /api/download-report → query AuditJob by reportToken
   - GET /api/admin/stats → aggregate analytics from DB
9. Remove mock data (MOCK_RUNS, MOCK_ANALYTICS) from lib/mock-data.ts
10. Update environment variable documentation in .env.example

Dependencies:
- Phase 4a (Authentication) must be done first for userId foreign keys
- PostgreSQL must be running (use Docker: docker run -e POSTGRES_PASSWORD=password -p 5432:5432 postgres)

Verification steps:
1. npx prisma migrate dev --name init
2. npm run dev
3. Create a user via /login
4. Upload a telemetry file via /api/upload-telemetry → should create Upload record
5. Check database: SELECT * FROM "Upload"; should show your uploaded file
6. Run npm test (may need to update test database or use SQLite for tests)
7. Ensure all 164 tests pass

Commit message: feat: add PostgreSQL persistence with Prisma
```

---

## Phase 4c: Background Job Queue with Bull + Redis

**Session Goal**: Move PDF generation to async background queue to prevent webhook timeouts

**Copy this prompt**:

```
Implement Prompt 3 from ENTERPRISE_ROADMAP.md: Add Bull job queue for async processing.

Specific tasks:
1. Install Bull and ioredis (npm install bull ioredis)
2. Ensure Redis is running (docker run -p 6379:6379 redis:latest)
3. Create lib/queue.ts exporting a Bull queue instance:
   - Queue name: "audits"
   - Redis connection from environment variables
4. Create workers/audit-worker.ts (separate Node.js process) that:
   - Listens to auditQueue.process()
   - For each job: generate PDF, send email, update audit_job status in DB
   - Implements exponential backoff retries (3 attempts)
   - Logs progress and errors
5. Modify app/api/webhook/route.ts:
   - Instead of calling processAuditJob() synchronously
   - Queue a job with auditQueue.add({ uploadId, userId, stripeSessionId })
   - Return 200 immediately (<500ms)
6. Update processAuditJob() in lib/audit-processor.ts to use Prisma instead of mock storage
7. For development: Create package.json script "worker:dev" to run ts-node workers/audit-worker.ts in parallel with npm run dev
8. Add REDIS_URL to .env.local and .env.example

Dependencies:
- Phase 4b (Database) must be done first
- Redis must be running
- Stripe test keys configured

Verification steps:
1. Start server: npm run dev
2. Start worker in separate terminal: npm run worker:dev
3. Upload telemetry and proceed to checkout
4. In test mode, confirm payment by using test card 4242424242424242
5. Webhook handler should return 200 within 500ms
6. Check Redis or Bull UI (bull-board package optional) to see job queued
7. Wait 10–30s for worker to process job
8. Verify audit_job.status = 'complete' in database
9. Check email log for report delivery
10. Run npm test

Commit message: feat: add Bull queue for async audit processing
```

---

## Phase 4d: Rate Limiting Middleware

**Session Goal**: Protect API endpoints from abuse

**Copy this prompt**:

```
Implement Prompt 4 from ENTERPRISE_ROADMAP.md: Add rate limiting.

Specific tasks:
1. Install @upstash/ratelimit and @upstash/redis
2. Create middleware.ts (or use app/middleware.ts) with rate limiting logic:
   - Import Ratelimit from @upstash/ratelimit
   - Create ratelimit instance from Redis environment variables
   - Define limits:
     * /api/upload-telemetry: 100 requests/hour per IP
     * /api/create-checkout: 50 requests/hour per IP
     * /api/download-report: 1000 requests/hour per IP
     * /api/admin/*: 1000 requests/hour per IP
   - Extract IP from request.ip
   - Call ratelimit.limit(ip)
   - Return 429 if !success, include RateLimit-* headers
3. Configure matcher in middleware to apply to /api/*
4. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to .env.local (get from Upstash.com)
5. Write tests to verify rate limiting behavior

Acceptance criteria:
- Requests within limit: 200 OK
- Requests after limit: 429 Too Many Requests
- Response includes X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset headers
- Rate limits are per IP

Verification steps:
1. Make 101 requests to /api/upload-telemetry within 1 hour from same IP
2. Request 100–101 should return 200, request 101+ should return 429
3. Check response headers for RateLimit-* values
4. Wait for hour window to expire, try again → should work
5. Run npm test

Commit message: feat: add rate limiting middleware
```

---

## Phase 4e: Input Validation with Zod

**Session Goal**: Validate all API request bodies at runtime

**Copy this prompt**:

```
Implement Prompt 5 from ENTERPRISE_ROADMAP.md: Add Zod input validation.

Specific tasks:
1. Install zod (npm install zod)
2. Create lib/validation/schemas.ts with schemas for each endpoint:
   - TelemetryUploadSchema: Validate POST /api/upload-telemetry body
   - CheckoutRequestSchema: Validate POST /api/create-checkout body
   - DownloadRequestSchema: Validate GET /api/download-report query params
   - (Webhook validation optional – Stripe SDK does it)
3. For each schema, define required/optional fields with appropriate types:
   - Strings: .string().min(1).max(500)
   - Numbers: .number().positive()
   - Enums: .enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'])
   - Arrays: .array(z.object({ ... }))
4. In each API route, parse request body using schema.parse():
   - If valid: proceed
   - If invalid: catch ZodError and return 400 with error details
5. Write unit tests for each schema (valid and invalid inputs)

Example structure:
```typescript
// lib/validation/schemas.ts
import { z } from 'zod';

export const TelemetryUploadSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']),
  startedAt: z.number(),
  steps: z.array(z.object({ ... })),
  events: z.array(z.object({ ... })),
}).strict();

// app/api/upload-telemetry/route.ts
import { TelemetryUploadSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const telemetry = TelemetryUploadSchema.parse(body);
    // Now telemetry is type-safe
    const result = validateUpload(telemetry);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid telemetry format', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
  }
}
```

Verification steps:
1. Send valid telemetry → should process normally
2. Send malformed JSON → 400 with validation errors
3. Send missing required fields → 400 with field errors
4. Send extra fields → should be stripped (.strict())
5. Run npm test for validation tests

Commit message: feat: add Zod input validation to API routes
```

---

## Phase 4f: Stripe Webhook Signature Verification

**Session Goal**: Ensure webhooks are genuinely from Stripe

**Copy this prompt**:

```
Implement Prompt 6 from ENTERPRISE_ROADMAP.md: Add Stripe webhook signature verification.

Specific tasks:
1. Install Stripe SDK (if not already): npm install stripe
2. Update app/api/webhook/route.ts:
   - Read the raw request body (not parsed JSON)
   - Extract stripe-signature header
   - Use stripe.webhooks.constructEvent(body, signature, secret) to verify
   - If verification fails, catch the error and return 401
   - If verification succeeds, proceed with event handling
3. Add STRIPE_WEBHOOK_SECRET to .env.local and .env.example
   - Get this from Stripe Dashboard → Developers → Webhooks → your endpoint → Signing secret

Example code:
```typescript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response(
      JSON.stringify({ error: 'Invalid signature' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Handle verified event
  if (event.type === 'checkout.session.completed') {
    // Queue audit job
    await auditQueue.add(...);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
```

Verification steps:
1. Install Stripe CLI (stripe-cli from Stripe)
2. Authenticate: stripe login
3. Forward webhooks: stripe listen --forward-to localhost:3000/api/webhook
4. Trigger test event: stripe trigger checkout.session.completed
5. Check that webhook is processed (not rejected with 401)
6. Manually tamper with signature in request → should return 401
7. Run npm test

Commit message: fix: add Stripe webhook signature verification
```

---

## Phase 4g: Secure Download Token Validation

**Session Goal**: Ensure report download tokens are valid and not expired

**Copy this prompt**:

```
Implement Prompt 7 from ENTERPRISE_ROADMAP.md: Enforce token expiry in download endpoint.

Specific tasks:
1. Update app/api/download-report/route.ts:
   - Extract token from query parameter: request.nextUrl.searchParams.get('token')
   - Query database for AuditJob with reportToken = token:
     const job = await prisma.auditJob.findUnique({ where: { reportToken: token } })
   - Check that job exists AND job.reportTokenExpiresAt > new Date()
   - If invalid or expired: return 401 with error message
   - If valid: serve the PDF file from reportFilePath
2. Add analytics logging: Log download event to analytics_events table
3. Add error handling for missing file

Example code:
```typescript
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { error: 'Missing token' },
      { status: 400 }
    );
  }

  const job = await prisma.auditJob.findUnique({
    where: { reportToken: token },
    include: { upload: { include: { user: true } } },
  });

  if (!job || job.reportTokenExpiresAt! < new Date()) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  // Log analytics
  await prisma.analyticsEvent.create({
    data: {
      userId: job.upload.user.id,
      eventType: 'report_downloaded',
      metadata: { auditJobId: job.id },
    },
  });

  // Serve PDF (use storage service from audit-processor)
  const pdf = await storage.getObject(job.reportFilePath!);
  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="audit-report.pdf"',
    },
  });
}
```

Verification steps:
1. Complete an audit (upload, pay, generate PDF)
2. Get the reportToken from the database
3. Download immediately: GET /api/download-report?token=<token> → should work (200)
4. Try with random token → should return 401
5. Update database to set reportTokenExpiresAt = now - 1 hour
6. Try to download again → should return 401
7. Reset reportTokenExpiresAt to future, try again → should work
8. Run npm test

Commit message: fix: enforce token expiry in download endpoint
```

---

## Phase 4h: CORS Headers

**Session Goal**: Enable cross-origin requests from allowed origins

**Copy this prompt**:

```
Implement Prompt 8 from ENTERPRISE_ROADMAP.md: Add CORS headers.

Specific tasks:
1. Update middleware.ts (or create middleware for API routes):
   - Add Access-Control-Allow-Origin header: set to FRONTEND_URL from env, or localhost for dev
   - Add Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
   - Add Access-Control-Allow-Headers: Content-Type, Authorization
   - Handle OPTIONS requests (preflight) by returning 200 with headers
2. Add FRONTEND_URL to .env.local and .env.example
3. For development: Allow localhost:3000

Example middleware code:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  const isAllowed = allowedOrigins.includes(origin);

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const response = NextResponse.next();
  if (isAllowed) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

Verification steps:
1. Open browser console and run:
   ```javascript
   fetch('http://localhost:3000/api/admin/stats').then(r => r.json())
   ```
2. Check response headers for Access-Control-Allow-Origin
3. Try from http://localhost:3001 (different port) → should work
4. Check Network tab in DevTools → preflight OPTIONS request should return 200
5. Run npm test

Commit message: feat: add CORS headers
```

---

## Phase 4.5 (Optional): Performance Optimization

### Phase 4.5a: Single-Pass Event Aggregation

```
Implement Prompt 9 from ENTERPRISE_ROADMAP.md: Single-pass event aggregation.

Goal: Refactor buildRunViewModel() to aggregate all event data in one loop instead of 4 passes.

Specific tasks:
1. Create lib/telemetry/aggregators.ts with aggregateEvents() function
2. This function should:
   - Take events: Event[]
   - Return EventAggregate { eventCounts, modelCosts, tokenUsage, timing }
   - Loop through events ONCE, accumulating all data
3. Replace the 4 separate calls in buildRunViewModel():
   - countEventsByKind() → included in aggregateEvents
   - extractModelCosts() → included in aggregateEvents
   - extractTokenUsage() → included in aggregateEvents
   - timing calculations → included in aggregateEvents
4. Update buildRunViewModel() to use aggregated data
5. Write tests comparing old vs. new (should produce same results)

Performance improvement: 4x faster for large event streams (e.g., 10k events = 40k→10k iterations)

Verification:
1. Run existing tests → all pass
2. Benchmark with large event array (optional)
3. npm test

Commit message: perf: single-pass event aggregation
```

---

## Phase 5a: Refactor Recommendations Engine

```
Implement Prompt 10 from ENTERPRISE_ROADMAP.md: Split recommendations into separate rule files.

Goal: Improve maintainability by separating each of 8 rules into independent files.

Specific tasks:
1. Create lib/recommendations/rules/ directory
2. Create one file per rule:
   - model-substitution.ts (Rule 1)
   - prompt-caching.ts (Rule 2)
   - retry-elimination.ts (Rule 3)
   - routing-fix.ts (Rule 4)
   - token-optimization.ts (Rule 5)
   - latency-improvement.ts (Rule 6)
   - hallucination-prevention.ts (Rule 7)
   - framework-overhead.ts (Rule 8)
3. Each file exports a function:
   export function checkXxx(data: RunViewModel, aei: AEIScore): AuditRecommendation | null
4. Update lib/recommendations/index.ts:
   - Import all rule functions
   - Define RULES array
   - generateRecommendations() iterates RULES, filters nulls, sorts by priority
5. Update tests to work with new structure

Verification:
1. npm test → all recommendation tests pass
2. Add a dummy 9th rule to RULES array → verify it gets executed
3. Remove it and verify tests still pass

Commit message: refactor: split recommendations into separate rule files
```

---

## Phase 5b: Comprehensive Test Suite

```
Implement Prompt 11 from ENTERPRISE_ROADMAP.md: Add comprehensive tests.

Goal: Increase test coverage to 250+ tests, focusing on new features.

Test areas:
1. Authentication (login, signup, session, logout)
   - Create user via signup
   - Log in with correct password → success
   - Log in with wrong password → 401
   - Access protected route without session → 401
   - Access protected route with session → 200
   - Logout clears session

2. Database operations
   - Create Upload record
   - Query Upload by userId
   - Create AuditJob record
   - Update AuditJob status
   - Query with indexes (verify performance)

3. Job queue
   - Add job to queue
   - Job gets processed by worker
   - Failed job retries 3 times
   - Successful job updates DB status to complete

4. Rate limiting
   - Make 100 requests → all succeed
   - Make request 101 → 429
   - Check RateLimit-* headers

5. Zod validation
   - Valid input → passes
   - Missing field → 400
   - Invalid type → 400
   - Extra fields stripped

6. Integration tests (end-to-end)
   - User uploads telemetry
   - System validates and qualifies
   - User proceeds to checkout
   - Payment confirmed
   - Audit job queued
   - PDF generated
   - Token created
   - User downloads PDF with token

All tests should pass: npm test

Commit message: test: add comprehensive test suite for Phase 4 features
```

---

## Phase 5c: Documentation Update

```
Implement Prompt 12 from ENTERPRISE_ROADMAP.md: Update documentation.

Goal: Complete and accurate documentation for new developers and operations.

Tasks:
1. Update README.md:
   - Add "Setup" section with PostgreSQL, Redis installation
   - Add .env configuration
   - Add scripts (npm run dev, npm run worker:dev, npm test)
   - Add troubleshooting section

2. Create docs/ARCHITECTURE.md:
   - System overview diagram (ASCII or link to image)
   - Component responsibilities
   - Data flow (upload → qualification → checkout → queue → PDF)
   - Database schema overview

3. Create docs/API.md:
   - All endpoints documented
   - Request/response examples (JSON)
   - Authentication requirements (session check)
   - Error codes
   - Rate limits per endpoint

4. Create docs/DEPLOYMENT.md:
   - Vercel deployment steps
   - Environment variables setup
   - Database migration steps
   - Redis connection
   - Stripe production keys

5. Add JSDoc to exported functions in lib/:
   - Every function: @param, @returns, @example
   - Complex algorithms: inline comments

6. Create docs/TROUBLESHOOTING.md:
   - Common errors and solutions
   - Database connection issues
   - Redis connection issues
   - Stripe webhook testing
   - Job queue debugging

Verification:
1. New developer reads README → can set up environment in <30 min
2. All API endpoints documented with examples
3. All exported functions have JSDoc

Commit message: docs: update documentation for Phase 4 completion
```

---

## Phase 6: Launch & Release

```
Implement Final Prompt from ENTERPRISE_ROADMAP.md: Prepare for launch.

Goal: Final checks and production release.

Tasks:
1. Run all tests: npm test → 250+ passing
2. Run linter: npm run lint → 0 errors
3. Build: npm run build → succeeds
4. Create release branch: git checkout -b release/v2.0.0
5. Write release notes (CHANGELOG.md):
   - Summary of Phase 4 + 5 changes
   - Breaking changes (if any)
   - New features (auth, database, queue, validation, rate limiting)
   - Bug fixes
6. Tag release: git tag v2.0.0
7. Deploy to staging environment (Vercel staging or separate instance)
8. Run smoke tests:
   - User signup/login works
   - Upload telemetry
   - Pay for audit
   - PDF generates and downloads
   - No errors in logs
9. Merge release/v2.0.0 → main
10. Deploy to production

Verification:
- Staging fully functional
- Production deployment succeeds
- Monitoring/logs show no errors

Commit messages:
- feat: release v2.0.0 (enterprise-ready)
- chore: update changelog for v2.0.0
```

---

## Quick Reference: Which Prompt Next?

Based on Phase 4 completion:

| Phase | Prompt | Status |
|-------|--------|--------|
| 4a | Authentication | ← Start here |
| 4b | Database | After 4a |
| 4c | Job Queue | After 4b |
| 4d | Rate Limiting | After 4a (can run parallel with 4c) |
| 4e | Zod Validation | Anytime |
| 4f | Webhook Signature | Anytime |
| 4g | Token Validation | After 4b |
| 4h | CORS Headers | Anytime |
| 4.5a | Event Aggregation | After 4b (optional) |
| 5a | Refactor Recommendations | After 4h (anytime) |
| 5b | Test Suite | After each phase |
| 5c | Documentation | After 5b |
| 6 | Launch | After 5c |

---

**Last Updated**: February 28, 2026
**Purpose**: Quick-reference prompts for each phase
**Usage**: Copy the relevant prompt into Claude Code, execute, and commit when done
