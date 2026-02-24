# Symphony-AION — Deployment Guide

## Backend → Railway

1. Go to https://railway.app and create a new project
2. Select "Deploy from GitHub repo" → connect this repository
3. Set the root directory to `/symphony-aion/backend`
4. Railway auto-detects Nixpacks — no extra config needed
5. Add environment variables in Railway dashboard:
   - `CORS_ORIGIN` = your Vercel frontend URL (e.g. https://symphony-aion.vercel.app)
   - `ADMIN_SECRET` = a strong random string (used to protect the /leads endpoint)
   - `DB_PATH` = `/app/aion_leads.db` (Railway persistent volume, or leave default for ephemeral)
6. Copy the Railway-provided URL — you will need it for the frontend

## Frontend → Vercel

1. Go to https://vercel.com and create a new project
2. Connect this repository, set root directory to `/symphony-aion/frontend`
3. Framework preset: Vite
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add environment variables:
   - `VITE_API_URL` = your Railway backend URL (e.g. https://symphony-aion-production.up.railway.app)
   - `VITE_FOUNDER_KEY` = your founder access key (default: AION2024 — change this)
   - `VITE_ADMIN_SECRET` = must match the ADMIN_SECRET set on Railway
   - `VITE_CALENDLY_URL` = your Calendly booking link (e.g. https://calendly.com/yourname/15min)
7. Deploy

## Local Development

### Backend
```bash
cd symphony-aion/backend
pip install -r requirements.txt
cp .env.example .env   # fill in values
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd symphony-aion/frontend
npm install
cp .env.example .env   # set VITE_API_URL=http://localhost:8000
npm run dev
```

## Verifying the Setup

1. Open the frontend URL in a browser — you should see the sign-up gate
2. Enter any email + company name and paste a sample JSON log
3. The 4-tab report should render within 2–3 seconds
4. To access Founder Mode: add `?founder=AION2024` to the URL (or your custom key)
5. In Founder Mode, the HISTORY tab shows all captured leads from the backend

## Sample JSON for Testing

Paste this into the audit input to confirm the pipeline works end-to-end:

```json
{
  "id": "run_test_001",
  "model": "gpt-4o",
  "usage": {
    "prompt_tokens": 8200,
    "completion_tokens": 1400,
    "total_tokens": 9600
  },
  "choices": [{"message": {"role": "assistant", "content": "Analysis complete."}}],
  "created": 1708900000
}
```

Expected result: Score 60–75, framework detected as "OpenAI Agents SDK", efficiency flagged as moderate.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS error in browser | Confirm `CORS_ORIGIN` on Railway exactly matches your Vercel URL (no trailing slash) |
| /leads returns 403 | Confirm `VITE_ADMIN_SECRET` matches `ADMIN_SECRET` on Railway |
| Blank screen on Vercel | Check that `vercel.json` rewrites exist and output dir is `dist` |
| API timeout | Railway free tier spins down after inactivity — first request may take 5–10s |
