# Symphony-AION Payment Pipeline — Deployment Checklist

This checklist ensures the **Upload → Pay $750 → Receive PDF** pipeline is fully functional.

## Required Environment Variables

### Stripe Payment Processing
- **STRIPE_SECRET_KEY**
  - **What it is**: Stripe API secret key for server-side payment processing
  - **Where to get it**: Stripe Dashboard → Developers → API Keys → Secret Key
  - **Used in**: `app/api/create-checkout/route.ts` (creates checkout sessions)
  - **What breaks without it**: Checkout will fail with "Stripe not configured" error; users cannot pay
  - **Value format**: `sk_live_...` (production) or `sk_test_...` (test mode)

- **STRIPE_WEBHOOK_SECRET**
  - **What it is**: Webhook signing secret for verifying Stripe payments
  - **Where to get it**: Stripe Dashboard → Developers → Webhooks → Select webhook → Signing secret
  - **Used in**: `app/api/webhook/route.ts` (validates payment events)
  - **What breaks without it**: Webhook signature verification skipped; payment events not trusted (security risk)
  - **Value format**: `whsec_...`

- **STRIPE_PRICE_ID** *(optional, for advanced configuration)*
  - **What it is**: Stripe price ID for the $750 product
  - **Where to get it**: Create product in Stripe Dashboard → copy price ID, or use dynamic pricing
  - **Used in**: `app/api/create-checkout/route.ts` (can use dynamic pricing instead)
  - **What breaks without it**: Only if using hardcoded price ID instead of dynamic pricing

### Email Delivery (Resend)
- **RESEND_API_KEY**
  - **What it is**: Resend API key for email delivery
  - **Where to get it**: Resend Dashboard (resend.com) → API Keys → Create key
  - **Used in**: `lib/email.ts` (sends audit reports and notifications)
  - **What breaks without it**: Emails logged to console only; users won't receive download links automatically
  - **Fallback behavior**: Console logging when not configured (dev/test mode)
  - **Value format**: `re_...`

### File Storage (Vercel Blob)
- **BLOB_READ_WRITE_TOKEN**
  - **What it is**: Vercel Blob storage authentication token
  - **Where to get it**: Vercel Dashboard → Storage → Blob → Create Token
  - **Used in**: `lib/audit-processor.ts` (stores generated PDFs)
  - **What breaks without it**: PDFs stored in memory only; won't persist after server restart
  - **Fallback behavior**: Logs warning, continues without persistence
  - **Value format**: `vercel_blob_rw_...`

### Application URLs
- **NEXT_PUBLIC_APP_URL**
  - **What it is**: Public URL of deployed app (used in emails, redirects)
  - **Where to get it**: Your deployment URL (e.g., Vercel project URL)
  - **Used in**: `lib/email.ts` (download links), `app/api/create-checkout/route.ts` (success/cancel URLs)
  - **What breaks without it**: Download links will use `http://localhost:3000` (won't work in production)
  - **Value format**: `https://your-domain.com` or `https://your-project.vercel.app`

- **NEXT_PUBLIC_API_URL** *(deprecated in favor of NEXT_PUBLIC_APP_URL)*
  - **What it is**: API server URL (legacy)
  - **Used in**: Fallback if NEXT_PUBLIC_APP_URL not set
  - **Value format**: Same as NEXT_PUBLIC_APP_URL

## Pipeline Verification Checklist

### 1. Upload Stage
- [ ] User uploads `.json` telemetry file
- [ ] `POST /api/upload-telemetry` accepts both JSON and FormData
- [ ] Telemetry validated against intake gate
- [ ] Response returns `qualified`, `summary`, and `telemetryHash`
- [ ] **Requires**: Authentication (existing)

### 2. Checkout Stage
- [ ] User clicks "Start Audit" with valid telemetry hash
- [ ] `POST /api/create-checkout` receives hash and creates Stripe session
- [ ] **If STRIPE_SECRET_KEY configured**: Real Stripe checkout session created, user redirected to Stripe
- [ ] **If STRIPE_SECRET_KEY missing**: Error message "Stripe not configured. Contact hello@symphony-aion.com"
- [ ] Checkout page loads with $750 price
- [ ] User enters payment info and pays

### 3. Payment Stage
- [ ] Stripe processes payment
- [ ] `POST /api/webhook` receives `checkout.session.completed` event
- [ ] Webhook verifies signature using STRIPE_WEBHOOK_SECRET
- [ ] AuditJob created in database
- [ ] Job enqueued for async processing
- [ ] Webhook returns 200 immediately

### 4. Processing Stage
- [ ] `lib/audit-processor.ts` processes AuditJob asynchronously
- [ ] Telemetry loaded from database
- [ ] PDF generated via `lib/pdf-report.ts`
- [ ] **If BLOB_READ_WRITE_TOKEN configured**: PDF stored to Vercel Blob, URL saved to AuditJob
- [ ] **If BLOB_READ_WRITE_TOKEN missing**: PDF kept in memory (warning logged), AuditJob.reportBlobUrl null
- [ ] AEI score calculated
- [ ] Report token generated (32-byte hex, 24-hour expiry)

### 5. Email Stage
- [ ] `sendReportEmail()` called with AuditJob data
- [ ] **If RESEND_API_KEY configured**: Email sent via Resend from `reports@symphony-aion.com`
  - [ ] Includes AEI score and grade
  - [ ] Includes download link: `https://app.example.com/api/download-report?token=XXX`
  - [ ] Shows 24-hour expiry warning
  - [ ] Sets reply-to: `hello@symphony-aion.com`
- [ ] **If RESEND_API_KEY missing**: Full email logged to console for manual inspection

### 6. Download Stage
- [ ] User receives email (or console output)
- [ ] Clicks download link
- [ ] `GET /api/download-report?token=XXX` called
- [ ] Token validated (exists in database, not expired)
- [ ] **If reportBlobUrl exists**: Redirected to Vercel Blob URL (302 redirect)
- [ ] **If reportBlobUrl null**: PDF regenerated on-the-fly
- [ ] PDF downloaded successfully
- [ ] Analytics event logged (`report_downloaded`)

## Deployment Workflow

### Development (Local)
```bash
# All env vars optional, everything falls back to console/in-memory
npm run dev
```

### Staging (Test Stripe Mode)
```bash
# Set test mode Stripe keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...

# Email and blob optional, will use console/memory
npm run build && npm start
```

### Production (Live)
```bash
# All env vars required
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_live_...
RESEND_API_KEY=re_...
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
NEXT_PUBLIC_APP_URL=https://symphony-aion.vercel.app

npm run build && npm start
```

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| Checkout returns "Stripe not configured" | STRIPE_SECRET_KEY missing or is `sk_test_placeholder` | Set real Stripe secret key in env vars |
| Webhook signature fails (401 errors) | STRIPE_WEBHOOK_SECRET missing or incorrect | Get signing secret from Stripe Dashboard → Webhooks |
| Emails not received | RESEND_API_KEY missing | Check console output for email content, or set RESEND_API_KEY |
| Download link returns 401 | Token expired or invalid | Ensure reportToken stored in AuditJob and not older than 24h |
| PDF download 500 error | reportBlobUrl null and PDF regeneration fails | Check BLOB_READ_WRITE_TOKEN, or ensure PDF generation dependencies available |
| Audit job never completes | Job queue not processing | Check Bull queue configuration, ensure job processor running |

## Testing the Pipeline

### Local Testing (No External Services)
```bash
# All operations will use console logging and in-memory storage
npm test
```

### Integration Testing (With Stripe Test Keys)
```bash
# Set test mode keys
export STRIPE_SECRET_KEY=sk_test_4eC39HqLyjWDarhtT657tSRf
export STRIPE_WEBHOOK_SECRET=whsec_test_1234567890...

# 1. Upload telemetry
curl -X POST http://localhost:3000/api/upload-telemetry \
  -H "Content-Type: application/json" \
  -d '{"telemetry": {...}}'

# 2. Create checkout
curl -X POST http://localhost:3000/api/create-checkout \
  -H "Content-Type: application/json" \
  -d '{"telemetryHash": "abc123..."}'

# 3. Simulate webhook (Stripe test event)
curl -X POST http://localhost:3000/api/webhook \
  -H "stripe-signature: t=...,v1=..." \
  -d '{"type": "checkout.session.completed", ...}'

# 4. Download report (once job completes)
curl http://localhost:3000/api/download-report?token=...
```

---

**Last Updated**: 2026-03-09
**Maintained By**: Symphony-AION Team
