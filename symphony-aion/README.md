# Symphony-AION

> **Forensic Token Intelligence for Enterprise AI**  
> Identify token waste and reduce AI infrastructure costs by up to 55%.

Symphony-AION is a production-ready web application that audits AI run logs, computes token efficiency scores, detects waste patterns, and provides cross-model cost comparisons. Two modes in one codebase:

- **Public Mode**: Sign-up gate → paste JSON → 4-tab free audit report → CTA to book a call
- **Founder Mode**: Full 6-tab dashboard with no gate, live lead database, and advanced analytics (access via `?founder=AION2024`)

## Quick Start

### Local Development

```bash
# Backend
cd symphony-aion/backend
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd symphony-aion/frontend
npm install
cp .env.example .env
npm run dev
```

Visit `http://localhost:5173` (frontend will default to `http://localhost:8000` for the API).

### Deploy

See [DEPLOY.md](./DEPLOY.md) for Railway (backend) and Vercel (frontend) deployment instructions.

## Project Structure

```
symphony-aion/
├── backend/
│   ├── main.py              FastAPI server + /audit endpoint
│   ├── ir_parser.py         Token parser engine (5 frameworks)
│   ├── requirements.txt      Python dependencies
│   ├── .env.example          Environment template
│   ├── Procfile              Railway deployment
│   └── railway.json          Railway config
│
├── frontend/
│   ├── package.json          Vite + React
│   ├── vite.config.js        Vite config
│   ├── index.html            HTML root
│   ├── .env.example          Environment template
│   ├── vercel.json           Vercel SPA config
│   └── src/
│       ├── main.jsx          React entry
│       └── App.jsx           Full unified component
│
└── DEPLOY.md                 Deployment guide
```

## Features

### IR Parser (ir_parser.py)

Supports 5 AI framework formats:
- **OpenAI Agents SDK** — `usage.prompt_tokens` / `completion_tokens`
- **CrewAI** — tasks array with `token_usage`
- **LangSmith** — `run_type`, nested runs
- **LangGraph** — `graph_state`, nodes, `channel_values`
- **Generic** — any JSON with token / cost / model fields

### Audit Report (4 sections)

1. **PULSE** — Efficiency score (10–98), grade (A–D), waste % vs optimized
2. **TELEMETRY** — Phase breakdown, loss events, worst performer
3. **COMPARE** — Cross-model pricing vs 6 baseline models
4. **REPLAY** — Timeline of steps with token counts
5. **GOVERNANCE** — 3 gates: Redundancy, Scope, Attribution
6. **HISTORY** (Founder only) — All captured leads from backend

### Backend API

- `POST /audit` — Submit JSON, get full audit payload
- `GET /leads` — Admin endpoint, protected by `?secret=ADMIN_SECRET`
- `GET /health` — Service status

## Configuration

### Backend (.env)

```env
CORS_ORIGIN=https://your-frontend.vercel.app
ADMIN_SECRET=your_admin_secret_here
DB_PATH=aion_leads.db
PORT=8000
```

### Frontend (.env)

```env
VITE_API_URL=https://your-backend.railway.app
VITE_FOUNDER_KEY=AION2024
VITE_ADMIN_SECRET=your_admin_secret_here
VITE_CALENDLY_URL=https://calendly.com/your-link
```

## Tech Stack

- **Backend**: FastAPI, SQLite (swap for Postgres in prod), Pydantic
- **Frontend**: React 18, Vite, vanilla CSS (no frameworks)
- **Deployment**: Railway (backend), Vercel (frontend)

## License

Proprietary — Symphony-AION
