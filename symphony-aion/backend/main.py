"""
Symphony-AION · FastAPI Backend
────────────────────────────────
Single endpoint: POST /audit
Stores leads: email + company + hash + score (SQLite, swap for Postgres in prod)
Run locally:
    pip install fastapi uvicorn python-multipart
    uvicorn main:app --reload --port 8000
Deploy to Railway/Render/Fly.io — push as-is, add CORS_ORIGIN env var.
"""
from __future__ import annotations
import os
import sqlite3
import json
from datetime import datetime
from contextlib import contextmanager
from typing import Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, validator
import ir_parser
# ─── App Setup ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Symphony-AION API",
    description="Forensic token auditor for enterprise AI run logs",
    version="1.0.0",
)
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN] if CORS_ORIGIN != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)
# ─── Database (SQLite — swap for Postgres in prod) ────────────────────────────
DB_PATH = os.getenv("DB_PATH", "aion_leads.db")
def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS leads (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                email       TEXT    NOT NULL,
                company     TEXT    NOT NULL,
                raw_hash    TEXT    NOT NULL,
                framework   TEXT,
                score       INTEGER,
                created_at  TEXT    NOT NULL
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_email ON leads(email)")
        conn.commit()
init_db()
@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
def save_lead(email: str, company: str, raw_hash: str,
              framework: str, score: int):
    with get_db() as conn:
        # Upsert: same email + same hash = idempotent (no duplicate entries)
        existing = conn.execute(
            "SELECT id FROM leads WHERE email = ? AND raw_hash = ?",
            (email, raw_hash)
        ).fetchone()
        if not existing:
            conn.execute(
                """INSERT INTO leads (email, company, raw_hash, framework, score, created_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (email, company, raw_hash, framework, score,
                 datetime.utcnow().isoformat() + "Z")
            )
# ─── Request / Response Models ────────────────────────────────────────────────
class AuditRequest(BaseModel):
    email:    str
    company:  str
    raw_json: str                    # The pasted / uploaded JSON text
    @validator("email")
    def email_must_have_at(cls, v):
        if "@" not in v or "." not in v:
            raise ValueError("Valid email required")
        return v.strip().lower()
    @validator("company")
    def company_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Company name required")
        return v.strip()
    @validator("raw_json")
    def json_not_empty(cls, v):
        if not v.strip():
            raise ValueError("JSON payload required")
        return v.strip()
class AuditResponse(BaseModel):
    ok:        bool
    audit:     dict
    framework: str
    hash:      str
# ─── Routes ───────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "symphony-aion", "version": "1.0.0"}
@app.post("/audit", response_model=AuditResponse)
def run_audit(req: AuditRequest):
    """
    Core endpoint.
    1. Parse raw JSON → RunRecord (framework detection + normalization)
    2. Compute four-section audit report
    3. Persist lead to DB
    4. Return full audit payload to frontend
    """
    # Parse
    try:
        record = ir_parser.parse(req.raw_json)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    # Compute audit
    try:
        audit = ir_parser.compute_audit(record)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audit computation failed: {e}")
    # Persist lead
    score = audit["efficiency"]["score"]
    try:
        save_lead(
            email=req.email,
            company=req.company,
            raw_hash=record.raw_hash,
            framework=record.framework,
            score=score,
        )
    except Exception:
        pass  # Non-fatal — don't fail the audit over a DB hiccup
    return AuditResponse(
        ok=True,
        audit=audit,
        framework=record.framework,
        hash=record.raw_hash,
    )
@app.get("/leads")
def list_leads(secret: Optional[str] = None):
    """
    Admin endpoint — returns all captured leads.
    Protect with ADMIN_SECRET env var in production.
    """
    admin_secret = os.getenv("ADMIN_SECRET", "")
    if admin_secret and secret != admin_secret:
        raise HTTPException(status_code=403, detail="Forbidden")
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM leads ORDER BY created_at DESC LIMIT 500"
        ).fetchall()
    return {"leads": [dict(r) for r in rows], "count": len(rows)}
# ─── Error Handlers ───────────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_error_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"ok": False, "detail": "Internal server error"},
    )
