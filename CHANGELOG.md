# Changelog

All notable changes to Symphony-AION are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-09

### Added

#### Core Metric Implementations

**AION Efficiency Index (AEI) - Canonical Formula**
- Replaced legacy AEI calculation with canonical formula: `AEI = max(0, 100 − Σwᵢpᵢ)`
- Implemented 5-component penalty system with weighted scoring:
  - **C1 LoopTax (30% weight)**: Measures token waste from retry loops
    - Formula: `(loop_tokens / total_tokens) × 100`
    - Penalty clipped to [0, 100]
  - **C2 FrameworkOverhead (20% weight)**: Measures inefficient prompt engineering
    - Formula: `(framework_tokens / total_tokens) × 100`
    - Tracks input token ratio against ideal 40% threshold
  - **C3 ModelMisallocation (25% weight)**: Detects routing of expensive models to simple tasks
    - Formula: `(frontier_calls_on_simple_tasks / total_calls) × 100`
    - Flags premium models (GPT-4, Claude Opus) on low-token tasks
  - **C4 DriftScore (15% weight)**: Measures tool calls deviating from original request
    - Formula: `(out_of_scope_tool_calls / total_tool_calls) × 100`
    - Uses governance/validation events as drift proxy
  - **C5 GateViolationRate (10% weight)**: Tracks policy violations and security gate failures
    - Formula: `(gate_blocks / total_evaluations) × 100`
    - Monitors validation failures and policy breaches

- **New AEI Thresholds** (replacing legacy 0-100 bands):
  - **80-100 CERTIFIED**: "Certified Efficiency" - Optimal performance with minimal oversight needed
  - **60-79 WARNING**: "Warning - Optimization Needed" - Performance acceptable but optimization required
  - **40-59 DEGRADED**: "Degraded Performance" - Significant inefficiencies detected
  - **0-39 SUSPENDED**: "Suspended - Immediate Action Required" - Critical remediation needed

**Governance Enforcement Index (GEI)**
- New metric: `GEI = (enforceable_flagged_events / total_flagged_events) × 100`
- Measures effectiveness of governance controls and policy enforcement
- **Three Sub-scores** (30/35/35 weighting):
  - **GEI-Cost (30%)**: Cost control policy enforcement
    - Monitors cost governance events and rate limit violations
    - Calculates enforcement rate: `successful_policies / (successful_policies + violations)`
  - **GEI-Authority (35%)**: RBAC and authorization policy enforcement
    - Tracks authentication failures and authorization blocks
    - Measures enforcement effectiveness through failed access attempts
  - **GEI-Privacy (35%)**: Data privacy policy enforcement
    - Monitors validation failures as privacy enforcement proxy
    - Detects repeated validation violations
- **Compliance Status Classification**:
  - `compliant` (≥80): Well-enforced governance controls
  - `warning` (60-79): Governance enforcement needs strengthening
  - `violation` (<60): Critical governance gaps detected

**System Health Index (SHI)**
- New holistic metric: `SHI = AEI × (1 − GEI/100)`
- Combines efficiency and governance into single health score
- **Health Status Classification**:
  - `healthy` (≥70): System operating with good health and efficiency
  - `caution` (50-69): System at acceptable levels but needs monitoring
  - `critical` (<50): System health critically degraded, requires intervention
- **Components**:
  - Integrates AEI (efficiency) and GEI (governance) assessments
  - Provides risk factor analysis: efficiency risk, governance risk, combined risk
  - Generates clinical health summary and actionable recommendations
  - Tracks health trends over time (improving/stable/degrading)

#### New Files

- `lib/aei-score.ts`: Complete AEI implementation with canonical formula
- `lib/gei-score.ts`: Complete GEI implementation with sub-score calculations
- `lib/shi-score.ts`: Complete SHI implementation with health assessment

#### Documentation

- `CHANGELOG.md`: This file - documents all metric implementations and changes

### Changed

- Updated AEI threshold definitions to match canonical standards (CERTIFIED/WARNING/DEGRADED/SUSPENDED)
- Replaced AEI component scoring with penalty-based system
- Updated AEI boardroom statements to reflect new thresholds

### Fixed

- Prisma client generation compatibility verified for v5.22.0
- npm dependencies restored and audited

### Testing

- 268 tests passing, 7 tests requiring updates for new formula
- Test suite includes:
  - Telemetry and real-world fixture testing
  - Recommendation rule validation
  - Database schema verification
  - Webhook signature validation
  - Token validation
  - Rate limiting tests
  - Authentication and authorization tests

### Known Issues

- 7 existing tests require updates to match new AEI formula and components
  - Tests expect old component names (costEfficiency, tokenEfficiency, etc.)
  - Risk flag assertions need updates for new flags (GOVERNANCE_DRIFT, etc.)
  - Grade threshold tests need updates for CERTIFIED/WARNING/DEGRADED/SUSPENDED bands

## Roadmap

### Phase 5: Integration & Monitoring (Next)

- [ ] Integrate GEI and SHI metrics into dashboard
- [ ] Add metric trend analysis and historical tracking
- [ ] Implement metric-based alerting and escalation
- [ ] Create custom governance policy templates
- [ ] Add audit compliance reporting

### Enterprise Features

- [ ] Multi-tenant metric isolation
- [ ] Custom SLA targets per tenant
- [ ] Automated cost optimization recommendations
- [ ] Governance policy framework
- [ ] Compliance certification tracking

## Version History

- **0.1.0** (2026-03-09): Initial release with canonical AEI/GEI/SHI metrics
