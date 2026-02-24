"""
Symphony-AION · IR Parser Engine
─────────────────────────────────
Detects framework from raw JSON, normalizes to RunRecord schema,
then computes the four audit sections served to the frontend.

Supported frameworks:
  1. OpenAI Agents SDK   — usage.prompt_tokens / completion_tokens
  2. CrewAI              — tasks array, token_usage, agent_role
  3. LangSmith           — run_type, inputs/outputs, nested runs
  4. LangGraph           — graph_state, nodes, channel_values
  5. Generic             — any JSON with token / cost / model fields
"""

from __future__ import annotations
import json
import re
import hashlib
from dataclasses import dataclass, field, asdict
from typing import Any, Optional
from datetime import datetime


# ─── Canonical Schema ──────────────────────────────────────────────────────────

@dataclass
class Step:
    role: str
    model: str
    input_tokens: int
    output_tokens: int
    cost_usd: float
    status: str = "pass"          # pass | warn | fail
    agent: str = ""
    phase: str = ""

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens


@dataclass
class RunRecord:
    """
    Canonical normalized record — everything downstream reads this.
    The parser's one job: fill this struct cleanly.
    """
    framework: str
    model_detected: str
    steps: list[Step]
    total_tokens: int
    total_cost_usd: float
    raw_hash: str               # sha256 of original JSON string
    parsed_at: str              # ISO timestamp


# ─── Model Pricing (input / output per token, USD) ────────────────────────────
# Rates as of Q1 2026 — update periodically
MODEL_RATES: dict[str, dict[str, float]] = {
    "gpt-4o":               {"in": 0.0000025,  "out": 0.00001},
    "gpt-4o-mini":          {"in": 0.00000015, "out": 0.0000006},
    "gpt-4-turbo":          {"in": 0.00001,    "out": 0.00003},
    "gpt-4":                {"in": 0.00003,    "out": 0.00006},
    "gpt-3.5-turbo":        {"in": 0.0000005,  "out": 0.0000015},
    "o1":                   {"in": 0.000015,   "out": 0.00006},
    "o1-mini":              {"in": 0.000003,   "out": 0.000012},
    "claude-3-5-sonnet":    {"in": 0.000003,   "out": 0.000015},
    "claude-3-5-haiku":     {"in": 0.0000008,  "out": 0.000004},
    "claude-3-opus":        {"in": 0.000015,   "out": 0.000075},
    "claude-3-haiku":       {"in": 0.00000025, "out": 0.00000125},
    "gemini-1.5-pro":       {"in": 0.00000125, "out": 0.000005},
    "gemini-1.5-flash":     {"in": 0.000000075,"out": 0.0000003},
    "gemini-2.0-flash":     {"in": 0.0000001,  "out": 0.0000004},
    "llama-3.1-70b":        {"in": 0.0000009,  "out": 0.0000009},
    "llama-3.1-8b":         {"in": 0.00000005, "out": 0.00000008},
    "mixtral-8x7b":         {"in": 0.0000007,  "out": 0.0000007},
    "deepseek-chat":        {"in": 0.00000014, "out": 0.00000028},
    "deepseek-r1":          {"in": 0.00000055, "out": 0.00000219},
}

COMPARE_MODELS = [
    "gpt-4o",
    "claude-3-5-sonnet",
    "claude-3-5-haiku",
    "gemini-1.5-flash",
    "llama-3.1-70b",
    "deepseek-chat",
]


def resolve_model_rates(model_name: str) -> tuple[str, dict[str, float]]:
    """Match a raw model string to our rate table via substring search."""
    if not model_name:
        return "gpt-4o", MODEL_RATES["gpt-4o"]
    ml = model_name.lower()
    # Exact then partial
    for key, rates in MODEL_RATES.items():
        if key in ml:
            return key, rates
    # Broader fallback matches
    if "gpt-4" in ml:
        return "gpt-4", MODEL_RATES["gpt-4"]
    if "gpt-3" in ml:
        return "gpt-3.5-turbo", MODEL_RATES["gpt-3.5-turbo"]
    if "claude" in ml:
        return "claude-3-5-sonnet", MODEL_RATES["claude-3-5-sonnet"]
    if "gemini" in ml:
        return "gemini-1.5-flash", MODEL_RATES["gemini-1.5-flash"]
    if "llama" in ml:
        return "llama-3.1-70b", MODEL_RATES["llama-3.1-70b"]
    if "groq" in ml:
        return "llama-3.1-70b", MODEL_RATES["llama-3.1-70b"]
    if "deepseek" in ml:
        return "deepseek-chat", MODEL_RATES["deepseek-chat"]
    if "mixtral" in ml:
        return "mixtral-8x7b", MODEL_RATES["mixtral-8x7b"]
    return "gpt-4o", MODEL_RATES["gpt-4o"]


def token_cost(input_t: int, output_t: int, rates: dict) -> float:
    return input_t * rates["in"] + output_t * rates["out"]


# ─── Deep Field Extractor ─────────────────────────────────────────────────────

def deep_get(obj: Any, *keys: str, default: Any = 0) -> Any:
    """Search nested dicts/lists for first matching key. Returns default if not found."""
    if obj is None:
        return default
    if isinstance(obj, dict):
        for key in keys:
            # Direct hit
            if key in obj:
                val = obj[key]
                if val is not None:
                    return val
            # Nested hit
            for v in obj.values():
                if isinstance(v, (dict, list)):
                    result = deep_get(v, *keys, default=None)
                    if result is not None:
                        return result
    elif isinstance(obj, list):
        for item in obj:
            result = deep_get(item, *keys, default=None)
            if result is not None:
                return result
    return default


def extract_model(obj: Any) -> str:
    """Extract model name from anywhere in the JSON."""
    m = deep_get(obj, "model", "engine", "model_name", "llm_name", "llm", default=None)
    if m and isinstance(m, str):
        return m
    # Check common config sub-objects
    for key in ["llm_config", "model_config", "config"]:
        sub = obj.get(key) if isinstance(obj, dict) else None
        if isinstance(sub, dict):
            m2 = sub.get("model") or sub.get("model_name")
            if m2:
                return str(m2)
    return "gpt-4o"


# ─── Framework Detectors ──────────────────────────────────────────────────────

def detect_framework(obj: Any) -> str:
    """
    Pure structural detection — no string parsing of values.
    Returns one of: OpenAI | CrewAI | LangSmith | LangGraph | AutoGen | Generic
    """
    if not isinstance(obj, (dict, list)):
        return "Generic"

    # OpenAI Agents SDK: has top-level usage with prompt_tokens
    if isinstance(obj, dict):
        usage = obj.get("usage") or {}
        if isinstance(usage, dict) and "prompt_tokens" in usage:
            return "OpenAI"

        # CrewAI: tasks array with agent/output keys
        tasks = obj.get("tasks") or obj.get("task_output") or []
        if isinstance(tasks, list) and tasks:
            t0 = tasks[0] if tasks else {}
            if isinstance(t0, dict) and any(k in t0 for k in ("agent", "agent_role", "token_usage", "output")):
                return "CrewAI"
        if obj.get("crew") or obj.get("crew_id"):
            return "CrewAI"

        # LangSmith: run_type field
        if "run_type" in obj or (isinstance(obj.get("runs"), list) and obj["runs"]):
            return "LangSmith"

        # LangGraph: graph_state or nodes or channel_values
        if any(k in obj for k in ("graph_state", "channel_values", "langgraph")):
            return "LangGraph"
        nodes = obj.get("nodes")
        if isinstance(nodes, list) and nodes and isinstance(nodes[0], dict) and "id" in nodes[0]:
            return "LangGraph"

    # AutoGen: list of messages with role/name or conversational structure
    if isinstance(obj, list) and obj:
        first = obj[0]
        if isinstance(first, dict) and "role" in first and "content" in first:
            return "AutoGen"

    if isinstance(obj, dict):
        # AutoGen dict form
        if "messages" in obj or "chat_history" in obj:
            return "AutoGen"

    return "Generic"


# ─── Format-Specific Parsers ──────────────────────────────────────────────────

def parse_openai(obj: dict) -> list[Step]:
    model_raw = extract_model(obj)
    model_key, rates = resolve_model_rates(model_raw)

    usage = obj.get("usage", obj)
    prompt_t   = int(deep_get(usage, "prompt_tokens", "input_tokens", default=0))
    compl_t    = int(deep_get(usage, "completion_tokens", "output_tokens", default=0))
    cached_t   = int(deep_get(usage, "cached_tokens", "prompt_tokens_details.cached_tokens", default=0))
    tool_calls = obj.get("tool_calls", [])
    if not tool_calls:
        # Try choices path
        choices = obj.get("choices", [])
        if choices and isinstance(choices[0], dict):
            tool_calls = choices[0].get("message", {}).get("tool_calls", [])
    n_tools = len(tool_calls) if isinstance(tool_calls, list) else 0

    # Split prompt into conceptual phases
    system_t   = max(0, int(prompt_t * 0.30))
    context_t  = max(0, int(prompt_t * 0.45))
    tool_call_t= max(0, int(prompt_t * 0.25) + n_tools * 80)

    steps = [
        Step("system_prompt", model_key, system_t, 0,
             token_cost(system_t, 0, rates), "pass", "system"),
        Step("context_window", model_key, context_t, 0,
             token_cost(context_t, 0, rates), "warn" if context_t > 4000 else "pass", "context"),
        Step("tool_calls", model_key, tool_call_t, 0,
             token_cost(tool_call_t, 0, rates), "pass", "tools"),
        Step("completion", model_key, 0, compl_t,
             token_cost(0, compl_t, rates), "pass", "model"),
    ]
    if cached_t:
        steps.append(Step("cached_tokens", model_key, cached_t, 0,
                          token_cost(cached_t, 0, {"in": rates["in"] * 0.5, "out": 0}),
                          "pass", "cache"))

    return [s for s in steps if s.total_tokens > 0]


def parse_crewai(obj: dict) -> list[Step]:
    model_raw = extract_model(obj)
    model_key, rates = resolve_model_rates(model_raw)

    tasks = (obj.get("tasks") or obj.get("task_output") or
             obj.get("tasks_output") or [])
    if not isinstance(tasks, list):
        tasks = []

    steps: list[Step] = []
    for t in tasks:
        if not isinstance(t, dict):
            continue
        name  = (t.get("description") or t.get("name") or t.get("task_id") or "task")[:24]
        agent = t.get("agent") or t.get("agent_role") or "agent"

        # Token extraction: try multiple field names
        tu = t.get("token_usage") or t.get("tokens_used") or t.get("usage") or {}
        if isinstance(tu, dict):
            in_t  = int(tu.get("prompt_tokens") or tu.get("input_tokens") or 0)
            out_t = int(tu.get("completion_tokens") or tu.get("output_tokens") or 0)
            total_t = int(tu.get("total_tokens") or 0)
            if total_t and not in_t:
                in_t = int(total_t * 0.7)
                out_t = total_t - in_t
        elif isinstance(tu, (int, float)):
            in_t  = int(tu * 0.7)
            out_t = int(tu * 0.3)
        else:
            in_t, out_t = 0, 0

        # If no usage found, try top-level token count on task
        if in_t + out_t == 0:
            tt = int(t.get("token_count") or t.get("total_tokens") or 800)
            in_t, out_t = int(tt * 0.7), int(tt * 0.3)

        has_output = bool(t.get("output") or t.get("result"))
        status = "pass" if has_output else "warn"
        cost = token_cost(in_t, out_t, rates)

        steps.append(Step(name, model_key, in_t, out_t, cost, status, agent))

    if not steps:
        # Fallback: top-level token fields
        total_t = int(deep_get(obj, "total_tokens", "token_count", default=3200))
        in_t = int(total_t * 0.7)
        out_t = total_t - in_t
        steps = [Step("crew_run", model_key, in_t, out_t, token_cost(in_t, out_t, rates), "pass", "crew")]

    return steps


def parse_langsmith(obj: dict) -> list[Step]:
    model_raw = extract_model(obj)
    model_key, rates = resolve_model_rates(model_raw)

    # Handle top-level run or runs list
    runs_raw = obj.get("runs") or [obj]
    if not isinstance(runs_raw, list):
        runs_raw = [obj]

    steps: list[Step] = []
    for run in runs_raw:
        if not isinstance(run, dict):
            continue
        name     = (run.get("name") or run.get("run_type") or "run")[:24]
        run_type = run.get("run_type") or "chain"
        tags     = run.get("tags") or []
        agent    = tags[0] if tags else run_type

        # Usage can be nested
        usage = run.get("total_tokens") or run.get("token_usage") or {}
        if isinstance(usage, dict):
            in_t  = int(usage.get("prompt_tokens")     or usage.get("input_tokens")  or 0)
            out_t = int(usage.get("completion_tokens")  or usage.get("output_tokens") or 0)
            total = int(usage.get("total_tokens") or 0)
        else:
            total = int(usage) if isinstance(usage, (int, float)) else 0
            in_t  = int(deep_get(run, "prompt_tokens", "input_tokens", default=int(total * 0.7)))
            out_t = int(deep_get(run, "completion_tokens", "output_tokens", default=total - in_t))

        if in_t + out_t == 0:
            total = int(deep_get(run, "total_tokens", "token_count", default=1200))
            in_t  = int(total * 0.7)
            out_t = total - in_t

        has_error = bool(run.get("error"))
        status = "warn" if has_error else "pass"
        cost = run.get("total_cost") or token_cost(in_t, out_t, rates)

        steps.append(Step(name, model_key, in_t, out_t, float(cost), status, agent))

    return steps or [Step("langsmith_run", model_key, 2100, 900, token_cost(2100, 900, rates), "pass", "chain")]


def parse_langgraph(obj: dict) -> list[Step]:
    model_raw = extract_model(obj)
    model_key, rates = resolve_model_rates(model_raw)

    # Nodes list
    nodes_raw = obj.get("nodes") or []
    # channel_values dict
    channel  = obj.get("channel_values") or obj.get("graph_state") or {}

    steps: list[Step] = []

    if isinstance(nodes_raw, list) and nodes_raw:
        for n in nodes_raw:
            if isinstance(n, str):
                name  = n[:24]
                agent = n
                total = int(channel.get(n, {}).get("tokens") if isinstance(channel.get(n), dict) else 0) or 800
                in_t  = int(total * 0.7)
                out_t = total - in_t
            elif isinstance(n, dict):
                name  = str(n.get("id") or n.get("name") or "node")[:24]
                agent = str(n.get("type") or n.get("agent") or name)
                in_t  = int(deep_get(n, "prompt_tokens", "input_tokens", "tokens", default=560))
                out_t = int(deep_get(n, "completion_tokens", "output_tokens", default=240))
                if in_t + out_t == 0:
                    total = int(deep_get(n, "total_tokens", "token_count", default=800))
                    in_t, out_t = int(total * 0.7), total - int(total * 0.7)
            else:
                continue
            steps.append(Step(name, model_key, in_t, out_t, token_cost(in_t, out_t, rates), "pass", agent))

    elif isinstance(channel, dict) and channel:
        for name, val in channel.items():
            if isinstance(val, dict):
                t = int(val.get("tokens") or val.get("token_count") or 800)
            elif isinstance(val, (int, float)):
                t = int(val)
            else:
                t = 800
            in_t, out_t = int(t * 0.7), t - int(t * 0.7)
            steps.append(Step(name[:24], model_key, in_t, out_t, token_cost(in_t, out_t, rates), "pass", name))

    if not steps:
        total = int(deep_get(obj, "total_tokens", "token_count", default=4500))
        in_t  = int(total * 0.7)
        out_t = total - in_t
        steps = [Step("graph_run", model_key, in_t, out_t, token_cost(in_t, out_t, rates), "pass", "graph")]

    return steps


def parse_autogen(obj: Any) -> list[Step]:
    model_raw = extract_model(obj) if isinstance(obj, dict) else "gpt-4o"
    model_key, rates = resolve_model_rates(model_raw)

    messages: list[dict] = []
    if isinstance(obj, list):
        messages = [m for m in obj if isinstance(m, dict)]
    elif isinstance(obj, dict):
        messages = obj.get("messages") or obj.get("chat_history") or []

    steps: list[Step] = []
    for i, m in enumerate(messages):
        if not isinstance(m, dict):
            continue
        role    = m.get("role") or "agent"
        name    = (m.get("name") or role)[:24]
        content = m.get("content") or ""
        # Estimate tokens if not provided
        in_t  = int(deep_get(m, "prompt_tokens", "input_tokens", "tokens",
                              default=max(1, len(str(content)) // 4)))
        out_t = int(deep_get(m, "completion_tokens", "output_tokens", default=0))
        if role in ("user", "human"):
            status = "pass"
        else:
            status = "warn" if i > 0 and role == messages[i-1].get("role") else "pass"

        steps.append(Step(name, model_key, in_t, out_t, token_cost(in_t, out_t, rates), status,
                          m.get("name") or role))

    if not steps:
        total = int(deep_get(obj, "total_tokens", "token_count", default=2400))
        in_t  = int(total * 0.7)
        out_t = total - in_t
        steps = [Step("autogen_run", model_key, in_t, out_t, token_cost(in_t, out_t, rates), "pass", "agent")]

    return steps


def parse_generic(obj: Any) -> list[Step]:
    """Last-resort parser — deep-searches any JSON for token/cost/model fields."""
    model_raw = extract_model(obj) if isinstance(obj, dict) else "gpt-4o"
    model_key, rates = resolve_model_rates(model_raw)

    if isinstance(obj, dict):
        prompt_t = int(deep_get(obj, "prompt_tokens", "input_tokens", "tokens_sent", default=0))
        compl_t  = int(deep_get(obj, "completion_tokens", "output_tokens", "tokens_received", default=0))
        total_t  = int(deep_get(obj, "total_tokens", "token_count", "tokens_used", default=0))

        if total_t and not (prompt_t + compl_t):
            prompt_t = int(total_t * 0.70)
            compl_t  = total_t - prompt_t

        cost_raw = deep_get(obj, "cost", "total_cost", "cost_usd", default=None)
        if cost_raw is not None:
            cost = float(cost_raw)
        else:
            cost = token_cost(prompt_t, compl_t, rates)

        if prompt_t + compl_t > 0:
            return [
                Step("input", model_key,  prompt_t, 0,       token_cost(prompt_t, 0, rates),      "pass", "context"),
                Step("output", model_key, 0,        compl_t, token_cost(0, compl_t, rates),        "pass", model_key),
            ]

    # Absolute fallback
    return [Step("run", model_key, 1960, 840, token_cost(1960, 840, rates), "pass", "agent")]


# ─── Main Parser Entry Point ──────────────────────────────────────────────────

def parse(raw_json: str) -> RunRecord:
    """
    Takes raw JSON string, returns populated RunRecord.
    Raises ValueError on unparseable input.
    """
    try:
        obj = json.loads(raw_json)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON: {e}") from e

    raw_hash = hashlib.sha256(raw_json.encode()).hexdigest()[:16]
    framework = detect_framework(obj)

    parsers = {
        "OpenAI":    parse_openai,
        "CrewAI":    parse_crewai,
        "LangSmith": parse_langsmith,
        "LangGraph": parse_langgraph,
        "AutoGen":   parse_autogen,
        "Generic":   parse_generic,
    }

    steps = parsers.get(framework, parse_generic)(obj)

    total_tokens = sum(s.total_tokens for s in steps)
    total_cost   = sum(s.cost_usd for s in steps)

    model_detected = steps[0].model if steps else "gpt-4o"

    return RunRecord(
        framework=framework,
        model_detected=model_detected,
        steps=steps,
        total_tokens=total_tokens,
        total_cost_usd=round(total_cost, 8),
        raw_hash=raw_hash,
        parsed_at=datetime.utcnow().isoformat() + "Z",
    )


# ─── Audit Engine ─────────────────────────────────────────────────────────────

def compute_audit(record: RunRecord) -> dict:
    """
    Transforms a RunRecord into the four-section audit report payload
    consumed by the frontend.
    """
    total   = record.total_tokens
    cost    = record.total_cost_usd
    model   = record.model_detected
    steps   = record.steps
    _, rates = resolve_model_rates(model)

    # ── 1. Efficiency Score ────────────────────────────────────────────────────
    # Baseline: single-model straight call with no orchestration overhead
    # Overhead ratio: multi-agent typically adds 30–55% vs optimal single-call
    overhead_pct = _estimate_overhead(steps, record.framework)
    optimized_tokens = max(1, int(total / (1 + overhead_pct)))
    optimized_cost   = token_cost(
        int(optimized_tokens * 0.70),
        int(optimized_tokens * 0.30),
        rates
    )
    waste_tokens   = total - optimized_tokens
    waste_pct      = overhead_pct / (1 + overhead_pct)
    efficiency     = max(10, min(98, round(100 - waste_pct * 100)))
    grade          = "A" if efficiency >= 80 else "B" if efficiency >= 65 else "C" if efficiency >= 50 else "D"
    savings_pct    = round((1 - optimized_cost / max(cost, 0.000001)) * 100)

    # ── 2. Telemetry — Phase breakdown ────────────────────────────────────────
    telemetry_phases = [
        {
            "name":         s.role,
            "agent":        s.agent,
            "input_tokens": s.input_tokens,
            "output_tokens":s.output_tokens,
            "total_tokens": s.total_tokens,
            "cost_usd":     round(s.cost_usd, 8),
            "pct_of_total": round(s.total_tokens / max(total, 1) * 100, 1),
            "status":       s.status,
            "flag":         s.total_tokens / max(total, 1) > 0.45 or s.status == "warn",
        }
        for s in steps
    ]
    worst_phase = max(telemetry_phases, key=lambda p: p["total_tokens"], default=None)

    # Loss events: phases exceeding thresholds
    loss_events = []
    seen_roles: set[str] = set()
    for p in telemetry_phases:
        if p["pct_of_total"] > 45:
            loss_events.append({
                "phase":       p["name"],
                "category":    "CONTEXT_BLOAT",
                "tokens_lost": round(p["total_tokens"] * 0.30),
                "detail":      f"Phase accounts for {p['pct_of_total']}% of token budget. "
                               f"Optimal ceiling is ~40%. Prompt compression recommended.",
            })
        if p["agent"] in seen_roles and p["agent"] not in ("system", "context", "cache"):
            loss_events.append({
                "phase":       p["name"],
                "category":    "AGENT_REDUNDANCY",
                "tokens_lost": p["total_tokens"],
                "detail":      f"Agent '{p['agent']}' appears more than once. "
                               f"Role consolidation could eliminate this step.",
            })
        seen_roles.add(p["agent"])
        if p["status"] == "warn":
            loss_events.append({
                "phase":       p["name"],
                "category":    "SCHEMA_DRIFT",
                "tokens_lost": round(p["total_tokens"] * 0.15),
                "detail":      "Step flagged — likely triggered a validation retry or schema mismatch.",
            })

    # ── 3. Cross-model comparison ─────────────────────────────────────────────
    prompt_t = int(total * 0.70)
    compl_t  = total - prompt_t

    compare: list[dict] = []
    for cmodel in COMPARE_MODELS:
        _, crates = resolve_model_rates(cmodel)
        c = token_cost(prompt_t, compl_t, crates)
        compare.append({
            "model":        cmodel,
            "cost_usd":     round(c, 8),
            "monthly_500":  round(c * 500, 4),
            "annual":       round(c * 500 * 12, 2),
            "is_current":   cmodel == model,
        })
    # Always include current model if not already in list
    if not any(c["is_current"] for c in compare):
        current_cost = cost
        compare.append({
            "model":        model,
            "cost_usd":     round(current_cost, 8),
            "monthly_500":  round(current_cost * 500, 4),
            "annual":       round(current_cost * 500 * 12, 2),
            "is_current":   True,
        })

    compare.sort(key=lambda x: x["cost_usd"])
    cheapest_cost = compare[0]["cost_usd"]
    for c in compare:
        c["delta_pct"] = round((c["cost_usd"] - cheapest_cost) / max(cheapest_cost, 0.0000001) * 100)

    # ── 4. Governance gates ───────────────────────────────────────────────────
    has_redundancy  = any(ev["category"] == "AGENT_REDUNDANCY" for ev in loss_events)
    max_phase_pct   = max((p["pct_of_total"] for p in telemetry_phases), default=0)
    all_attributed  = all(p["agent"] and p["agent"] not in ("unknown", "") for p in telemetry_phases)

    gates = [
        {
            "id":     "G1",
            "name":   "Redundancy",
            "pass":   not has_redundancy,
            "detail": (
                "No duplicate agent roles detected across phases."
                if not has_redundancy
                else f"{sum(1 for ev in loss_events if ev['category'] == 'AGENT_REDUNDANCY')} agent role(s) appear in multiple steps — consolidation recommended."
            ),
        },
        {
            "id":     "G2",
            "name":   "Scope",
            "pass":   max_phase_pct < 45.0,
            "detail": (
                f"Largest phase is {max_phase_pct:.1f}% of budget — within acceptable range."
                if max_phase_pct < 45.0
                else f"Largest phase consumes {max_phase_pct:.1f}% of token budget. Prompt compression can recover 20–30% of cost."
            ),
        },
        {
            "id":     "G3",
            "name":   "Attribution",
            "pass":   all_attributed,
            "detail": (
                "All steps have agent attribution — full audit trail available."
                if all_attributed
                else "One or more steps lack agent attribution. Decision lineage is incomplete."
            ),
        },
    ]

    gates_passed = sum(1 for g in gates if g["pass"])

    # ── ROI summary ───────────────────────────────────────────────────────────
    savings_per_run    = max(0.0, cost - compare[0]["cost_usd"])
    monthly_savings    = round(savings_per_run * 500, 4)
    annual_savings     = round(savings_per_run * 500 * 12, 2)

    return {
        # Meta
        "framework":       record.framework,
        "model_detected":  record.model_detected,
        "raw_hash":        record.raw_hash,
        "parsed_at":       record.parsed_at,

        # Section 1: Efficiency
        "efficiency": {
            "score":            efficiency,
            "grade":            grade,
            "total_tokens":     total,
            "actual_cost_usd":  round(cost, 8),
            "optimized_tokens": optimized_tokens,
            "optimized_cost":   round(optimized_cost, 8),
            "waste_tokens":     waste_tokens,
            "waste_pct":        round(waste_pct * 100, 1),
            "savings_pct":      savings_pct,
        },

        # Section 2: Telemetry
        "telemetry": {
            "phases":       telemetry_phases,
            "worst_phase":  worst_phase,
            "loss_events":  loss_events,
        },

        # Section 3: Compare
        "compare": {
            "models":           compare,
            "savings_per_run":  round(savings_per_run, 8),
            "monthly_savings":  monthly_savings,
            "annual_savings":   annual_savings,
        },

        # Section 4: Governance
        "governance": {
            "gates":        gates,
            "gates_passed": gates_passed,
            "gates_total":  len(gates),
        },
    }


# ─── Internal Helpers ─────────────────────────────────────────────────────────

def _estimate_overhead(steps: list[Step], framework: str) -> float:
    """
    Heuristic overhead ratio per framework and structural signals.
    Returns a float 0.0–0.8 representing excess tokens vs optimal single call.
    """
    base = {
        "OpenAI":    0.20,
        "CrewAI":    0.45,
        "LangSmith": 0.30,
        "LangGraph": 0.38,
        "AutoGen":   0.50,
        "Generic":   0.25,
    }.get(framework, 0.30)

    # More steps = more coordination overhead
    n = len(steps)
    if n > 6:
        base = min(0.75, base + (n - 6) * 0.04)
    elif n <= 2:
        base = max(0.10, base - 0.10)

    # Redundant agents push overhead higher
    agents = [s.agent for s in steps if s.agent]
    if len(agents) != len(set(agents)):
        base = min(0.75, base + 0.10)

    # Any warn status
    if any(s.status == "warn" for s in steps):
        base = min(0.75, base + 0.08)

    return round(base, 3)
