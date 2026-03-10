# Symphony-AION v2.1 — Complete Specification Sheet

**Last Updated**: March 10, 2026
**Version**: 2.1.0
**Status**: Production Ready
**Phase**: 4b (Enterprise + Security)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Overview](#product-overview)
3. [Core Metrics Engine](#core-metrics-engine)
4. [System Architecture](#system-architecture)
5. [API Specifications](#api-specifications)
6. [Database Schema](#database-schema)
7. [Security & Compliance](#security--compliance)
8. [Infrastructure & Deployment](#infrastructure--deployment)
9. [Performance & Scalability](#performance--scalability)
10. [Feature Matrix](#feature-matrix)
11. [Roadmap](#roadmap)

---

## Executive Summary

Symphony-AION v2.1 is a **Forensic AI Workflow Intelligence Platform** that audits AI orchestration workflows, generates financial and governance reports, and delivers actionable optimization recommendations.

### Key Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| **Report Generation Time** | ~15 seconds | From telemetry upload to PDF ready |
| **Supported Models** | 19 LLMs | Across 6 providers |
| **Supported Frameworks** | 6+ frameworks | LangChain, LlamaIndex, Claude Code, etc. |
| **Audit Report Sections** | 6 comprehensive | Executive summary through optimization roadmap |
| **Scoring Indexes** | 3 primary + 8 sub-metrics | AEI, GEI, SHI with component breakdowns |
| **Recommendation Rules** | 8 optimization rules | Cost, performance, governance, risk-focused |
| **Database Records** | 7 core entities | User, Upload, AuditJob, AnalyticsEvent, AuditLog, FreePreviewRequest + telemetry |
| **Authentication Methods** | Email/password + MFA | NextAuth.js with TOTP + backup codes |
| **Payment Integration** | Stripe | One-time audit ($750) + monthly ($1,500) |
| **API Endpoints** | 25+ endpoints | RESTful, async-first design |

---

## Product Overview

### Value Proposition

**Problem**: AI teams lack visibility into workflow costs, efficiency, and governance compliance. Costs balloon without clear optimization pathways.

**Solution**: Symphony-AION ingests telemetry, produces forensic audits with:
- **AEI Score**: Efficiency index (0–100) with 5-component breakdown
- **GEI Score**: Governance compliance (0–100) with 3 sub-scores
- **SHI Score**: System health combining efficiency + governance
- **PDF Report**: 30–50 pages with cost breakdowns, risk analysis, and ROI-quantified recommendations
- **Secure Delivery**: 24-hour expiring download links, email with summary

### Pricing Tiers

| Tier | Cost | Audits/Month | Features |
|------|------|--------------|----------|
| **Professional** | $750/audit | 1 | Single audit + recommendations + PDF |
| **Monthly** | $1,500/month | 100 | 100 audits/month + API access + priority support |
| **Enterprise** | Custom | Unlimited | Dedicated infra, SLA, custom rules, governance templates |

---

## Core Metrics Engine

### 1. AION Efficiency Index (AEI)

**Canonical Formula**: `AEI = max(0, 100 − Σwᵢpᵢ)`

A penalty-based scoring system where efficiency is the absence of waste.

#### Component Penalties (5 Total)

| Component | Weight | Formula | What It Measures | Range |
|-----------|--------|---------|------------------|-------|
| **C1: LoopTax** | 30% | `(loop_tokens / total_tokens) × 100` | Token waste from retries, loops, validation failures | [0, 100] |
| **C2: FrameworkOverhead** | 20% | `(framework_tokens / total_tokens) × 100` | Inefficient prompt engineering, excess input tokens | [0, 100] |
| **C3: ModelMisallocation** | 25% | `(frontier_calls_simple_tasks / total_calls) × 100` | Premium models (GPT-4, Opus) on low-token tasks | [0, 100] |
| **C4: DriftScore** | 15% | `(out_of_scope_tool_calls / total_tool_calls) × 100` | Tool calls deviating from original request | [0, 100] |
| **C5: GateViolationRate** | 10% | `(gate_blocks / total_evaluations) × 100` | Policy violations and governance gate failures | [0, 100] |

#### AEI Thresholds & Grades

| Score | Grade | Label | Color | Urgency | Action |
|-------|-------|-------|-------|---------|--------|
| 80–100 | **A** | Certified Efficiency | Green (#1A6B45) | None | Maintain, monitor |
| 60–79 | **B** | Warning — Optimization Needed | Blue (#1A4A7A) | Monitor | Apply medium-priority rules |
| 40–59 | **C** | Degraded Performance | Orange (#B87A10) | Address | Apply high-priority rules |
| 0–39 | **F** | Suspended — Immediate Action Required | Red (#8B1A1A) | Critical | Escalate to framework team |

#### Example Thresholds (Boardroom Statements)

- **AEI 90+**: "Workflow is operating at certified efficiency. Minimal optimization opportunities."
- **AEI 80–89**: "Certified efficiency achieved. Standard maintenance monitoring sufficient."
- **AEI 70–79**: "Warning-level performance. Targeted optimizations will yield meaningful improvements."
- **AEI 50–69**: "Degraded performance detected. Significant cost and efficiency improvements available."
- **AEI <50**: "Suspended status. Critical inefficiencies require immediate remediation."

---

### 2. Governance Enforcement Index (GEI)

**Formula**: `GEI = (enforceable_flagged_events / total_flagged_events) × 100`

Measures effectiveness of governance controls and policy enforcement.

#### Sub-Scores (3 Total, 30/35/35 Weighting)

| Sub-Score | Weight | Events | Formula | What It Measures |
|-----------|--------|--------|---------|------------------|
| **GEI-Cost** | 30% | GOVERNANCE, RATE_LIMIT | `(cost_policies / (cost_policies + violations)) × 100` | Cost control policy enforcement |
| **GEI-Authority** | 35% | AUTH_FAILURE | `(auth_success / (auth_success + auth_failure)) × 100` | RBAC and authorization enforcement |
| **GEI-Privacy** | 35% | VALIDATION_FAILED | `(validation_success / (validation_success + validation_failed)) × 100` | Data privacy policy enforcement |

#### GEI Compliance Status

| Score | Status | Meaning | Action |
|-------|--------|---------|--------|
| ≥80 | **Compliant** | Well-enforced governance controls | Maintain and extend |
| 60–79 | **Warning** | Governance enforcement needs strengthening | Add monitoring rules |
| <60 | **Violation** | Critical governance gaps detected | Escalate and remediate |

---

### 3. System Health Index (SHI)

**Formula**: `SHI = AEI × (1 − GEI/100)`

Combines efficiency (AEI) and governance (GEI) into a holistic system health metric.

#### Health Status Classification

| Score | Status | Meaning | Recommendation |
|-------|--------|---------|-----------------|
| ≥70 | **Healthy** | System operating with good health and efficiency | Maintain current controls |
| 50–69 | **Caution** | System at acceptable levels but needs monitoring | Increase monitoring frequency |
| <50 | **Critical** | System health critically degraded | Immediate intervention required |

#### Risk Factors

- **Efficiency Risk**: AEI < 60 (performance degradation)
- **Governance Risk**: GEI < 60 (control gaps)
- **Combined Risk**: Both AEI and GEI < 60 (critical condition)

---

## System Architecture

### High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 14)                        │
│  ┌─────────────┬──────────────┬──────────────┬─────────────────┐ │
│  │ Upload Page │ Checkout     │ Dashboard    │ Admin Panel     │ │
│  │ (Audit      │ (Stripe)     │ (AEI/GEI/SHI)│ (Analytics)     │ │
│  │ Uploader)   │              │              │                 │ │
│  └─────────────┴──────────────┴──────────────┴─────────────────┘ │
└──────────────────────────┬───────────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│               API Layer (Next.js App Routes)                     │
│  ┌──────────────┬──────────────┬──────────────┬───────────────┐ │
│  │ /api/analyze │ /api/upload  │ /api/webhook │ /api/admin/*  │ │
│  │ (AEI/GEI/SHI)│ -telemetry   │ (Stripe)     │ (Stats,Logs)  │ │
│  │              │              │              │               │ │
│  └──────────────┴──────────────┴──────────────┴───────────────┘ │
│  ┌──────────────┬──────────────┬──────────────┬───────────────┐ │
│  │ /api/auth/*  │ /api/create- │ /api/download│ /api/jobs/*   │ │
│  │ (NextAuth)   │ checkout     │ -report      │ (Queue status)│ │
│  │              │ (Stripe)     │ (Token auth) │               │ │
│  └──────────────┴──────────────┴──────────────┴───────────────┘ │
└──────────────────────────┬───────────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│             Scoring & Processing Engines (TypeScript)            │
│  ┌──────────────┬──────────────┬──────────────────────────────┐ │
│  │ aei-score.ts │ gei-score.ts │ shi-score.ts                 │ │
│  │ (Canonical   │ (Policy      │ (Holistic health)            │ │
│  │  formula)    │  enforcement) │                              │ │
│  └──────────────┴──────────────┴──────────────────────────────┘ │
│  ┌──────────────┬──────────────┬──────────────────────────────┐ │
│  │ ir-parser    │ recommendations.ts                            │ │
│  │ (Framework   │ (8 optimization rules + ROI analysis)         │ │
│  │  detection)  │                                               │ │
│  └──────────────┴──────────────────────────────────────────────┘ │
│  ┌──────────────┬──────────────┬──────────────────────────────┐ │
│  │ pdf-generator│ audit-processor.ts                             │
│  │ (jsPDF +     │ (Async orchestration + job queue)              │
│  │  charts)     │                                                │ │
│  └──────────────┴──────────────────────────────────────────────┘ │
└──────────────────────────┬───────────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│            Background Processing (Bull Queue + Redis)            │
│  Worker: Process audit jobs, generate PDFs, send emails           │
│  Storage: Vercel Blob (PDF artifacts)                            │
│  Cache: Redis (session, rate limit, download tokens)             │
└──────────────────────────┬───────────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│                  Database (PostgreSQL)                           │
│  ┌──────────────┬──────────────┬──────────────┬───────────────┐ │
│  │ User         │ Upload       │ AuditJob     │ Analytics     │ │
│  │ (Auth+RBAC)  │ (Telemetry)  │ (Results)    │ Event + Logs  │ │
│  │              │              │              │               │ │
│  └──────────────┴──────────────┴──────────────┴───────────────┘ │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ FreePreviewRequest (One per email, scoring preview)          │ │
│  └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Component Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS | UI/Dashboard/Audit uploader |
| **Backend** | Next.js API Routes, FastAPI (optional) | REST endpoints, business logic |
| **Scoring** | TypeScript | AEI/GEI/SHI calculations |
| **Report** | jsPDF, embedded charts | PDF generation with visualizations |
| **Queue** | Bull + Redis | Async job processing |
| **Auth** | NextAuth.js + TOTP | Email/password + MFA |
| **Database** | PostgreSQL + Prisma ORM | Structured data persistence |
| **Storage** | Vercel Blob | PDF artifacts, telemetry backups |
| **Cache** | Redis (Upstash) | Session, tokens, rate limiting |
| **Payments** | Stripe API | Checkout, webhooks, invoice tracking |
| **Email** | Resend API | Report delivery, transactional emails |

---

## API Specifications

### Authentication Endpoints

#### `POST /api/auth/signup`

Create a new user account.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "subscriptionTier": "free",
    "mfaEnabled": false
  },
  "timestamp": 1678800000000
}
```

---

#### `POST /api/auth/[...nextauth]`

NextAuth.js provider routes (login, callback, signout, session).

**Supported Providers**:
- Email + Password
- Credentials (via `/api/auth/signin`)

**Session Response**:
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "expires": "2026-03-17T12:00:00Z"
}
```

---

### MFA Endpoints

#### `POST /api/auth/mfa/enable`

Enable TOTP multi-factor authentication.

**Response**:
```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEBLW64TMMQ======",
    "qrCode": "data:image/png;base64,...",
    "backupCodes": [
      "BACKUP-CODE-001",
      "BACKUP-CODE-002",
      ...
    ]
  }
}
```

---

#### `POST /api/auth/mfa/verify`

Verify TOTP token to complete MFA setup.

**Request**:
```json
{
  "token": "123456"
}
```

---

### Audit Processing Endpoints

#### `POST /api/analyze`

**Primary endpoint** for uploading telemetry and triggering audit analysis.

**Request** (multipart/form-data):
```
file: <JSON telemetry>
```

Or JSON body:
```json
{
  "telemetry": {
    "id": "run-001",
    "started_at": "2025-02-25T12:00:00Z",
    "status": "COMPLETED",
    "framework": "generic",
    "steps": [
      {
        "id": "step-01",
        "name": "Classify Intent",
        "model": "gpt-4o-mini",
        "input_tokens": 200,
        "output_tokens": 50,
        "latency_ms": 1200,
        "status": "COMPLETED"
      }
    ]
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "uploadId": "upload-123",
    "hash": "abc123def456...",
    "qualified": true,
    "framework": "generic",
    "modelCount": 1,
    "totalCostUSD": 0.012,
    "aei": {
      "overall": 72,
      "grade": "B",
      "label": "Warning - Optimization Needed",
      "components": {
        "loopTax": 10,
        "frameworkOverhead": 20,
        "modelMisallocation": 15,
        "driftScore": 5,
        "gateViolationRate": 0
      }
    },
    "gei": {
      "overall": 85,
      "status": "compliant",
      "subScores": {
        "cost": 80,
        "authority": 90,
        "privacy": 85
      }
    },
    "shi": {
      "overall": 72,
      "status": "caution",
      "aei": 72,
      "gei": 85
    },
    "estimatedSavings": 1200,
    "projectedMonthlyROI": 1.6,
    "telemetryHash": "abc123def456..."
  },
  "timestamp": 1678800000000
}
```

**Response** (402 Payment Required - not qualified):
```json
{
  "success": false,
  "error": {
    "code": "NOT_QUALIFIED",
    "message": "Workflow does not meet minimum cost threshold ($0.05 minimum, found $0.003)"
  },
  "timestamp": 1678800000000
}
```

---

#### `POST /api/create-checkout`

Create Stripe checkout session.

**Request**:
```json
{
  "telemetryHash": "abc123def456...",
  "tier": "professional"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "cs_test_123...",
    "url": "https://checkout.stripe.com/pay/cs_test_123...",
    "status": "created"
  },
  "timestamp": 1678800000000
}
```

---

#### `POST /api/webhook`

**Stripe webhook handler** for payment events.

**Triggered On**:
- `checkout.session.completed`: Create AuditJob, trigger async processing

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Event processed"
}
```

---

#### `GET /api/download-report?token=XXX`

**Secure report download** with token validation.

**Parameters**:
- `token`: 32-byte hex token, valid for 24 hours

**Response**:
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="symphony-aion-report.pdf"`
- PDF binary stream (200–400 KB)

**Response** (401 Unauthorized):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Token is invalid or expired"
  }
}
```

---

#### `GET /api/jobs/[jobId]`

Get status of audit job.

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "job-123",
    "status": "completed",
    "aeiScore": {...},
    "recommendations": [...],
    "reportToken": "secure-token-123...",
    "reportTokenExpiresAt": "2025-02-26T12:00:00Z",
    "completedAt": "2025-02-25T12:15:00Z"
  },
  "timestamp": 1678800000000
}
```

---

### Free Preview Endpoint

#### `POST /api/free-preview`

Generate scoring preview (free, no payment).

**Request**:
```json
{
  "telemetry": {...},
  "email": "user@example.com",
  "consentMarketing": false
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "aei": 72,
    "gei": 85,
    "shi": 72,
    "grade": "B",
    "estimatedSavings": 1200,
    "message": "Preview generated. Full audit available via checkout."
  }
}
```

---

### Admin Endpoints

#### `GET /api/admin/stats?days=30`

Get aggregated analytics and usage stats.

**Response**:
```json
{
  "success": true,
  "data": {
    "daily": [
      {
        "date": "2025-02-25",
        "uploads": 12,
        "qualified": 10,
        "payments": 8,
        "reportsGenerated": 8,
        "averageAei": 74,
        "averageRoi": 1.8,
        "estimatedRevenue": 6000
      }
    ],
    "summary": {
      "totalUploads": 120,
      "conversionRate": 0.83,
      "completionRate": 0.8,
      "totalRevenue": 60000,
      "averageAei": 72,
      "averageRoi": 1.6
    }
  },
  "timestamp": 1678800000000
}
```

---

## Database Schema

### Core Entities (PostgreSQL)

#### User

```sql
CREATE TABLE "User" (
  id              TEXT PRIMARY KEY,
  email           TEXT UNIQUE NOT NULL,
  password        TEXT,
  name            TEXT,
  subscriptionTier TEXT DEFAULT 'free',
  role            TEXT DEFAULT 'user',  -- user | admin | super_admin
  mfaEnabled      BOOLEAN DEFAULT false,
  mfaSecret       TEXT,                 -- TOTP secret (base32)
  mfaBackupCodes  TEXT[],               -- Array of backup codes
  createdAt       TIMESTAMP DEFAULT NOW(),
  updatedAt       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_user_role ON "User"(role);
```

---

#### Upload

```sql
CREATE TABLE "Upload" (
  id              TEXT PRIMARY KEY,
  userId          TEXT NOT NULL REFERENCES "User"(id),
  telemetry       JSONB NOT NULL,       -- Full telemetry JSON
  hash            TEXT UNIQUE NOT NULL, -- SHA-256 hash for deduplication
  framework       TEXT,                 -- Detected framework
  modelCount      INT,
  totalCostUSD    FLOAT,
  createdAt       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_upload_userid ON "Upload"(userId);
CREATE INDEX idx_upload_createdat ON "Upload"(createdAt);
```

---

#### AuditJob

```sql
CREATE TABLE "AuditJob" (
  id                  TEXT PRIMARY KEY,
  uploadId            TEXT UNIQUE NOT NULL REFERENCES "Upload"(id),
  userId              TEXT NOT NULL REFERENCES "User"(id),
  stripeSessionId     TEXT UNIQUE,
  status              TEXT DEFAULT 'queued', -- queued | processing | completed | failed | pending_payment
  aeiScore            JSONB,                 -- Full AEI breakdown
  geiScore            JSONB,                 -- Full GEI breakdown
  shiScore            JSONB,                 -- Full SHI breakdown
  recommendations     JSONB,                 -- Array of recommendation objects
  reportToken         TEXT UNIQUE,           -- Secure download token
  reportTokenExpiresAt TIMESTAMP,
  reportPath          TEXT,                  -- Path in Vercel Blob
  error               TEXT,
  createdAt           TIMESTAMP DEFAULT NOW(),
  completedAt         TIMESTAMP
);

CREATE INDEX idx_auditjob_userid ON "AuditJob"(userId);
CREATE INDEX idx_auditjob_status ON "AuditJob"(status);
CREATE INDEX idx_auditjob_reporttoken ON "AuditJob"(reportTokenExpiresAt);
```

---

#### AnalyticsEvent

```sql
CREATE TABLE "AnalyticsEvent" (
  id        INT PRIMARY KEY DEFAULT nextval('analytics_id_seq'),
  userId    TEXT REFERENCES "User"(id),
  eventType TEXT NOT NULL,  -- upload | qualified | payment_completed | report_downloaded
  metadata  JSONB,
  createdAt TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analytics_createdat ON "AnalyticsEvent"(createdAt);
CREATE INDEX idx_analytics_user_event ON "AnalyticsEvent"(userId, eventType);
```

---

#### AuditLog

```sql
CREATE TABLE "AuditLog" (
  id        TEXT PRIMARY KEY,
  userId    TEXT REFERENCES "User"(id) ON DELETE CASCADE,
  action    TEXT NOT NULL,  -- upload_telemetry | create_checkout | payment_completed
  resource  TEXT,           -- uploadId | auditJobId
  ipAddress TEXT,
  userAgent VARCHAR(500),
  result    TEXT NOT NULL,  -- success | failure | blocked
  metadata  JSONB,
  createdAt TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_auditlog_user ON "AuditLog"(userId, createdAt);
CREATE INDEX idx_auditlog_action ON "AuditLog"(action, createdAt);
CREATE INDEX idx_auditlog_result ON "AuditLog"(result);
```

---

#### FreePreviewRequest

```sql
CREATE TABLE "FreePreviewRequest" (
  id               TEXT PRIMARY KEY,
  email            TEXT UNIQUE NOT NULL, -- One free preview per email
  telemetryHash    TEXT NOT NULL,
  aei              FLOAT,
  gei              FLOAT,
  shi              FLOAT,
  grade            TEXT,
  consentMarketing BOOLEAN DEFAULT false,
  ipAddress        TEXT,
  userAgent        VARCHAR(500),
  createdAt        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_freepreview_email ON "FreePreviewRequest"(email);
CREATE INDEX idx_freepreview_createdat ON "FreePreviewRequest"(createdAt);
```

---

### Relationships & Integrity

```
User (1) ──────► (Many) Upload
User (1) ──────► (Many) AuditJob
User (1) ──────► (Many) AnalyticsEvent
User (1) ──────► (Many) AuditLog
Upload (1) ────► (1) AuditJob
```

---

## Security & Compliance

### Authentication & Authorization

#### NextAuth.js Configuration

- **Providers**: Email/Password, Credentials
- **Session Strategy**: Database (secure, stateless)
- **JWT Secret**: 256-bit random value (environment variable)
- **CSRF Protection**: Enabled by default

#### Multi-Factor Authentication (MFA)

- **Type**: Time-based One-Time Password (TOTP)
- **Library**: `speakeasy` + `qrcode`
- **Recovery**: 8-10 backup codes (one-time use)
- **Enforcement**: Optional per user, mandatory for admin roles

#### Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| **user** | Create/view own audits, download own reports, access free preview |
| **admin** | All user + manage users, view analytics, create audit jobs manually |
| **super_admin** | All + system configuration, super-admin initialization, token management |

### Data Security

#### Encryption

- **In Transit**: TLS 1.3 (HTTPS)
- **At Rest**: PostgreSQL native encryption (optional) + application-level encryption for sensitive fields
- **Passwords**: bcryptjs (10 rounds)
- **Tokens**: 32-byte random hex (192-bit entropy)

#### Sensitive Data Handling

| Data | Protection |
|------|-----------|
| Passwords | bcryptjs hash, never logged |
| API Keys | Environment variables only, never in code |
| Stripe tokens | Never stored, handled by Stripe API |
| User emails | Indexed for lookup, salted + hashed for analytics |
| Telemetry | Stored as JSONB, encrypted by PostgreSQL SSL |
| Download tokens | 24-hour expiry, one-time use, secure random generation |

#### Rate Limiting

- **Login attempts**: 5 per IP per minute
- **API uploads**: 10 per user per hour
- **Checkout creation**: 3 per user per hour
- **Download**: 1 per token per request (no replay)

### Compliance

| Standard | Status | Notes |
|----------|--------|-------|
| **GDPR** | Ready | User data export, deletion, consent logging |
| **SOC 2** | Roadmap | Audit trails, access logs, encryption |
| **HIPAA** | N/A | Not a healthcare application |
| **PCI-DSS** | Delegated | Stripe handles payment processing |

---

## Infrastructure & Deployment

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (Frontend + API)                  │
│  ├─ Next.js 14 application                                  │
│  ├─ App Routes (API endpoints)                              │
│  ├─ Environment variables management                        │
│  └─ Automated deployments on git push                       │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────────┐ ┌────────────────┐ ┌──────────────┐
│ PostgreSQL DB    │ │ Vercel Blob    │ │ Upstash      │
│ (Vercel Postgres)│ │ (PDF storage)  │ │ Redis        │
│                  │ │                │ │              │
│ • User accounts  │ │ • PDF reports  │ │ • Rate limit │
│ • Audits         │ │ • Telemetry    │ │ • Sessions   │
│ • Jobs           │ │ • Backups      │ │ • Cache      │
│ • Logs           │ │                │ │ • Queue      │
└──────────────────┘ └────────────────┘ └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────────┐ ┌────────────────┐ ┌──────────────┐
│ Stripe API       │ │ Resend Email   │ │ Observability│
│ (Payments)       │ │ (Transactional)│ │ (TBD)        │
│                  │ │                │ │              │
│ • Checkout       │ │ • Report email │ │ • Logs       │
│ • Webhooks       │ │ • Summaries    │ │ • Traces     │
│ • Invoices       │ │ • Updates      │ │ • Metrics    │
└──────────────────┘ └────────────────┘ └──────────────┘
```

### Environment Variables (Required)

```env
# Next.js
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://symphony-aion.com

# Database
DATABASE_URL=postgresql://user:password@host/symphony_aion

# Auth
NEXTAUTH_URL=https://symphony-aion.com
NEXTAUTH_SECRET=<256-bit-random-hex>

# Stripe
STRIPE_PUBLIC_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Resend Email
RESEND_API_KEY=re_xxx

# Vercel Blob
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx

# Redis/Upstash
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Feature Flags
NEXT_PUBLIC_ENABLE_MOCKING=false
NEXT_PUBLIC_FREE_PREVIEW_ENABLED=true
NEXT_PUBLIC_MFA_ENFORCED_FOR_ADMINS=true

# Admin
ADMIN_INITIALIZATION_KEY=<random-secret-for-super-admin-setup>
```

### Deployment Checklist

1. ✅ Create PostgreSQL database (Vercel Postgres)
2. ✅ Run `prisma migrate deploy`
3. ✅ Set all environment variables in Vercel dashboard
4. ✅ Generate Stripe API keys, set webhook URL to `/api/webhook`
5. ✅ Create Resend email account, set API key
6. ✅ Initialize Upstash Redis
7. ✅ Create Vercel Blob token
8. ✅ Deploy to Vercel: `git push` triggers automatic build and deploy
9. ✅ Test full workflow: upload → qualify → checkout → process → download
10. ✅ Monitor logs and analytics

---

## Performance & Scalability

### Benchmarks (v2.1 Baseline)

| Operation | Latency | Throughput | Notes |
|-----------|---------|-----------|-------|
| **Audit analysis** | 2–5 sec | 1/sec per container | In-process, synchronous |
| **PDF generation** | 8–12 sec | 1/sec per worker | jsPDF, background queue |
| **API response** | 50–200 ms | 1000+ req/sec | Vercel auto-scaling |
| **Database query** | 10–50 ms | Direct PostgreSQL | Indexed, JSONB ops |
| **Telemetry parse** | 100–500 ms | Framework-dependent | IR parser, variable complexity |

### Scalability Strategy

#### Horizontal Scaling

- **Frontend**: Vercel auto-scales (edge functions, serverless)
- **API**: Next.js App Routes run serverless (auto-scaling)
- **Background Jobs**: Bull queue on Redis, horizontal worker pools (future)
- **Database**: PostgreSQL connection pooling (Vercel Postgres)

#### Caching Layers

| Layer | Technology | TTL | Use Case |
|-------|-----------|-----|----------|
| **Browser** | HTTP cache headers | 1 hour | Dashboard assets, static pages |
| **CDN** | Vercel Edge | 1 hour | Dashboard API responses |
| **Application** | Redis | 15 min | Session, rate limits, tokens |
| **Database** | Query result cache | N/A | PostgreSQL native caching |

#### Rate Limiting Strategy

```typescript
// Per-user, per-endpoint rate limits (enforced via Redis)
{
  "api.upload": { limit: 10, window: "1h" },
  "api.checkout": { limit: 3, window: "1h" },
  "api.download": { limit: 100, window: "1h" },
  "auth.login": { limit: 5, window: "1m" }
}
```

### Monitoring & Observability

#### Key Metrics

- **Audit completion rate**: % of jobs reaching "completed" status
- **PDF generation time**: P50, P95, P99 latencies
- **API response time**: P50, P95 latencies by endpoint
- **Error rate**: % of failed requests
- **Queue depth**: Number of pending jobs in Bull queue

#### Alerts

- PDF generation > 30 sec
- API error rate > 1%
- Queue depth > 100 jobs
- Database connection pool > 80% utilization
- Memory usage > 80%

---

## Feature Matrix

### v2.1 Core Features

| Feature | Status | Description |
|---------|--------|-------------|
| **AEI Scoring** | ✅ Shipped | 5-component penalty system, canonical formula |
| **GEI Scoring** | ✅ Shipped | 3 sub-scores (cost, authority, privacy), compliance status |
| **SHI Scoring** | ✅ Shipped | Holistic health metric combining AEI + GEI |
| **PDF Reports** | ✅ Shipped | 6-section reports, 30–50 pages, jsPDF + charts |
| **Recommendations** | ✅ Shipped | 8 optimization rules, ROI-quantified, sortable by priority |
| **Stripe Checkout** | ✅ Shipped | One-time $750, monthly $1,500, test mode included |
| **Email Delivery** | ✅ Shipped | 24-hour expiring links, Resend integration |
| **Authentication** | ✅ Shipped | Email/password, NextAuth.js, session-based |
| **MFA (TOTP)** | ✅ Shipped | 2-factor authentication, backup codes, optional/mandatory |
| **RBAC** | ✅ Shipped | User, admin, super_admin roles with permissions |
| **Rate Limiting** | ✅ Shipped | Per-endpoint, per-user, Redis-backed |
| **Analytics** | ✅ Shipped | Daily/summary stats, conversion tracking, revenue metrics |
| **Audit Logs** | ✅ Shipped | All user actions logged with IP, user agent, metadata |
| **Free Preview** | ✅ Shipped | Score preview without payment, email capture |
| **Framework Detection** | ✅ Shipped | Auto-detect LangChain, LlamaIndex, generic, etc. |
| **Model Pricing** | ✅ Shipped | 19 models across 6 providers, configurable fallback |
| **Database** | ✅ Shipped | PostgreSQL, Prisma ORM, JSONB telemetry storage |
| **Background Queue** | ✅ Shipped | Bull + Redis, async PDF generation + email delivery |
| **Secure Downloads** | ✅ Shipped | 24-hour token expiry, one-time use, rate limited |
| **Admin Dashboard** | 🚧 WIP | Analytics, user management, audit logs access |
| **Governance Rules** | 🚧 WIP | Custom cost/authority/privacy policies per org |
| **Workflow Templates** | 🚧 WIP | Pre-built benchmark audits for common patterns |

### v2.1 Security Features

| Feature | Status | Description |
|---------|--------|-------------|
| **HTTPS/TLS** | ✅ Shipped | TLS 1.3, auto-renewing certificates |
| **Password Hashing** | ✅ Shipped | bcryptjs, 10 rounds, never logged |
| **CSRF Protection** | ✅ Shipped | NextAuth.js default |
| **Rate Limiting** | ✅ Shipped | Per-endpoint, IP-based, Redis-backed |
| **Audit Logging** | ✅ Shipped | All actions logged with context |
| **MFA** | ✅ Shipped | TOTP + backup codes |
| **RBAC** | ✅ Shipped | Role-based access control |
| **Token Expiry** | ✅ Shipped | 24-hour download links |
| **Input Validation** | ✅ Shipped | Zod schemas for all API inputs |
| **SQL Injection Protection** | ✅ Shipped | Prisma ORM parameterized queries |
| **XSS Protection** | ✅ Shipped | React automatic escaping, no dangerousHTML |
| **GDPR Ready** | ✅ Shipped | User export, deletion, consent logging |

---

## Roadmap

### Phase 5: Enterprise Governance (Q2 2026)

**Focus**: Custom governance policies, multi-tenant isolation, audit compliance

- [ ] Custom governance rule templates
- [ ] Policy builder UI (cost limits, tool whitelists, etc.)
- [ ] SLA management per organization
- [ ] Compliance certification tracking
- [ ] Policy violation alerting + escalation
- [ ] Governance audit trails
- [ ] Custom thresholds per org

### Phase 6: Advanced Analytics (Q3 2026)

**Focus**: Trend analysis, predictive insights, historical comparisons

- [ ] Cost trend analysis (month-over-month)
- [ ] Efficiency degradation alerts
- [ ] Recommendation ROI tracking (pre/post implementation)
- [ ] Workflow template library
- [ ] Peer benchmarking (anonymized)
- [ ] Predictive cost optimization
- [ ] Custom dashboards and KPIs

### Phase 7: Integration Ecosystem (Q4 2026)

**Focus**: Framework integrations, observability, alerts

- [ ] Native Claude Code integration
- [ ] LangChain middleware telemetry exporter
- [ ] Datadog/New Relic integration
- [ ] Slack alerting
- [ ] Webhook notifications
- [ ] GraphQL API
- [ ] SDK for custom frameworks

### Phase 8: AI-Powered Optimization (2027)

**Focus**: Autonomous recommendations, ML-based cost prediction

- [ ] LLM-generated optimization strategies
- [ ] Cost prediction with ML models
- [ ] Anomaly detection for efficiency drops
- [ ] Autonomous policy suggestions
- [ ] Fine-tuning recommendations (model selection)
- [ ] Token optimization suggestions

---

## Appendix: Quick Reference

### AEI Quick Scores

| Score | Grade | Decision |
|-------|-------|----------|
| 90+ | A | Excellent — no action needed |
| 80–89 | A | Good — standard monitoring |
| 70–79 | B | Acceptable — plan optimizations |
| 60–69 | B | Borderline — implement recommendations |
| 50–59 | C | Poor — urgent optimization needed |
| 40–49 | C | Severe — escalate to team |
| <40 | F | Critical — immediate remediation |

### GEI Compliance Quick Guide

| Score | Status | Action |
|-------|--------|--------|
| ≥80 | Compliant | Maintain controls |
| 60–79 | Warning | Increase monitoring |
| <60 | Violation | Escalate and remediate |

### Supported Frameworks (v2.1)

1. **Claude Code** (Anthropic SDK)
2. **LangChain**
3. **LlamaIndex**
4. **Vellum**
5. **Custom REST** (JSON with model, tokens, duration)
6. **Generic** (Any JSON with standard fields)

### Supported Models (19 Total)

**Anthropic** (5):
- Claude 3 Haiku, Sonnet, Opus
- Claude 3.5 Haiku, Sonnet

**OpenAI** (5):
- GPT-4, GPT-4 Turbo, GPT-4o, GPT-4o-mini
- o1-preview, o1-mini

**Google** (3):
- Gemini 1.5 Pro, Flash
- Gemini 2.0-Flash

**Meta** (3):
- Llama 3.1 (70B, 8B)
- Llama Guard 3

**Mistral** (2):
- Mistral Large, Medium

**xAI** (2):
- Grok-1, Grok-1-Vision

### Recommendation Rules (8 Total)

1. **MODEL_SUBSTITUTION**: Replace expensive models with capable cheaper alternatives
2. **PROMPT_CACHING**: Cache repeated prompts to reduce token costs
3. **RETRY_ELIMINATION**: Reduce validation loops and escalations
4. **ROUTING_FIX**: Route simple tasks to fast/cheap models
5. **HALLUCINATION_PREVENTION**: Add validation gates to reduce failures
6. **TOKEN_OPTIMIZATION**: Minimize prompt size and output tokens
7. **PARALLEL_EXECUTION**: Execute independent steps concurrently
8. **FRAMEWORK_OVERHEAD_REDUCTION**: Reduce instrumentation overhead

---

## Document Information

- **Version**: 2.1.0
- **Last Updated**: March 10, 2026
- **Author**: Symphony-AION Engineering
- **Status**: Production Ready
- **License**: Proprietary — All rights reserved

For questions or updates, contact: **engineering@symphony-aion.com**

---
