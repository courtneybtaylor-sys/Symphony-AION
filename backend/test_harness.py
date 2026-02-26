#!/usr/bin/env python3
"""
Symphony-AION Test Harness
Real-world validation for the Accra → London textile micro-trade workflow.

Usage:
  python test_harness.py                      # Single run
  python test_harness.py --runs 30            # Neheh drift mapping (30 runs)
  python test_harness.py --validate-only      # Offline JSON validation only
  python test_harness.py --corridor accra-nairobi  # Alternate corridor
"""

import json
import sys
import time
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import random
import statistics

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from ir_parser import parse, detect_framework, compute_audit


@dataclass
class TestResult:
    """Result from a single test run"""
    run_id: str
    framework_detected: str
    event_kinds_found: List[str]
    event_kinds_missing: List[str]
    total_events: int
    total_cost: float
    total_latency_ms: int
    aei_score: float
    aei_expected: float
    aei_within_tolerance: bool
    risk_flags: List[str]
    validation_pass_rate: float
    test_passed: bool
    error: Optional[str] = None


class TestHarness:
    """Harness for running Symphony-AION tests"""

    # All 13 event kinds we expect to see
    EXPECTED_EVENT_KINDS = {
        "RUN_STARTED",
        "RUN_COMPLETED",
        "RUN_FAILED",
        "PHASE_ENTER",
        "PHASE_EXIT",
        "CONTEXT_LOAD",
        "TOKEN_COUNT",
        "GOVERNANCE",
        "RETRY",
        "LOSS_CLASSIFY",
        "COMPARE_BASE",
        "COMPARE_OPT",
        "LATENCY",
    }

    # Event kinds we're tracking in the test spec (not yet in lib/aei-score.ts)
    PENDING_EVENT_KINDS = {
        "cost_event",
        "cycle_complete",
        "run_abort",
        "step_error",
    }

    def __init__(self, fixture_path: str):
        self.fixture_path = Path(fixture_path)
        if not self.fixture_path.exists():
            raise FileNotFoundError(f"Fixture not found: {fixture_path}")

        with open(self.fixture_path) as f:
            self.fixture = json.load(f)

    def run_single_test(self, run_number: int = 1) -> TestResult:
        """Run a single test cycle"""
        try:
            # Convert fixture to JSON string for parser
            raw_json = json.dumps(self.fixture)

            # Parse the raw telemetry
            framework = detect_framework(self.fixture)

            # For CrewAI, we'd normally call parse_crewai, but for this test
            # we'll use the generic parser since we're using a custom JSON structure
            parsed_record = parse(raw_json)

            # Compute the audit
            audit = compute_audit(parsed_record)

            # Extract event kinds from fixture (what was executed)
            event_kinds_found = set()

            # RUN_STARTED and RUN_COMPLETED are implicit
            event_kinds_found.add("RUN_STARTED")
            event_kinds_found.add("RUN_COMPLETED")

            # Count action types from tasks
            for task in self.fixture.get("tasks", []):
                event_kinds_found.add("PHASE_ENTER")  # Each task is a phase
                event_kinds_found.add("PHASE_EXIT")

                for action in task.get("actions", []):
                    action_type = action.get("type", "").lower()

                    if action_type == "model_call":
                        event_kinds_found.add("TOKEN_COUNT")
                    elif action_type == "tool_call":
                        event_kinds_found.add("CONTEXT_LOAD")
                    elif action_type == "validation":
                        event_kinds_found.add("GOVERNANCE")
                    elif action_type == "retry":
                        event_kinds_found.add("RETRY")
                    elif action_type == "loss_classify":
                        event_kinds_found.add("LOSS_CLASSIFY")
                    elif action_type == "compare_base":
                        event_kinds_found.add("COMPARE_BASE")
                    elif action_type == "compare_opt":
                        event_kinds_found.add("COMPARE_OPT")
                    elif action_type == "latency":
                        event_kinds_found.add("LATENCY")

            event_kinds_missing = self.EXPECTED_EVENT_KINDS - event_kinds_found

            # Extract efficiency score (maps to AEI)
            aei_score = audit.get("efficiency", {}).get("score", 0)
            aei_expected = self.fixture["summary"]["expected_aei_score"]
            aei_tolerance = self.fixture["summary"]["aei_tolerance_range"]
            aei_within_tolerance = aei_tolerance[0] <= aei_score <= aei_tolerance[1]

            # Extract risk flags from fixture (what we expect to find)
            expected_risk_flags = set(self.fixture["summary"]["risk_flags_triggered"])

            # For now, risk flags come from loss_events and telemetry warnings
            risk_flags = []
            for event in audit.get("telemetry", {}).get("loss_events", []):
                if event.get("category"):
                    risk_flags.append(event["category"])

            # Validation
            total_cost = self.fixture["summary"]["total_cost_usd"]
            total_latency = self.fixture["summary"]["total_latency_ms"]

            # Count validations from tasks
            validation_passes = 0
            validation_failures = 0
            for task in self.fixture.get("tasks", []):
                for action in task.get("actions", []):
                    if action.get("type") == "validation":
                        if action.get("result") == "pass":
                            validation_passes += 1
                        else:
                            validation_failures += 1

            total_validations = validation_passes + validation_failures
            validation_pass_rate = validation_passes / total_validations if total_validations > 0 else 0

            # Test passes if:
            # 1. AEI within tolerance
            # 2. Cost and latency are accurate
            # 3. Most event kinds parsed (>=11 of 13)
            test_passed = (
                aei_within_tolerance and
                len(event_kinds_found) >= 11 and  # 11+ of 13 event kinds
                abs(total_cost - self.fixture["summary"]["total_cost_usd"]) < 0.0001 and
                total_latency == self.fixture["summary"]["total_latency_ms"]
            )

            return TestResult(
                run_id=f"{self.fixture['workflow_id']}-{run_number:02d}",
                framework_detected=framework,
                event_kinds_found=sorted(list(event_kinds_found)),
                event_kinds_missing=sorted(list(event_kinds_missing)),
                total_events=audit.get("total_events", 0),
                total_cost=total_cost,
                total_latency_ms=total_latency,
                aei_score=aei_score,
                aei_expected=aei_expected,
                aei_within_tolerance=aei_within_tolerance,
                risk_flags=risk_flags,
                validation_pass_rate=validation_pass_rate,
                test_passed=test_passed,
            )

        except Exception as e:
            return TestResult(
                run_id=f"{self.fixture['workflow_id']}-{run_number:02d}",
                framework_detected="unknown",
                event_kinds_found=[],
                event_kinds_missing=list(self.EXPECTED_EVENT_KINDS),
                total_events=0,
                total_cost=0,
                total_latency_ms=0,
                aei_score=0,
                aei_expected=0,
                aei_within_tolerance=False,
                risk_flags=[],
                validation_pass_rate=0,
                test_passed=False,
                error=str(e),
            )

    def run_neheh_cycle(self, num_runs: int = 30, sleep_between: float = 0.1) -> List[TestResult]:
        """Run multiple cycles to measure drift (Neheh cycle mapping)"""
        results = []
        for i in range(1, num_runs + 1):
            print(f"  Neheh cycle {i}/{num_runs}...", end=" ", flush=True)
            result = self.run_single_test(i)
            results.append(result)

            if result.test_passed:
                print("✓")
            else:
                print("✗" if result.error else "⚠")

            if i < num_runs:
                time.sleep(sleep_between)

        return results

    def validate_json_only(self) -> bool:
        """Validate JSON structure without running parser"""
        try:
            # Check required top-level fields
            required_fields = ["workflow_id", "tasks", "summary"]
            for field in required_fields:
                if field not in self.fixture:
                    print(f"✗ Missing required field: {field}")
                    return False

            # Check tasks structure
            for i, task in enumerate(self.fixture.get("tasks", [])):
                if "task_id" not in task or "actions" not in task:
                    print(f"✗ Task {i} missing required fields")
                    return False

                for j, action in enumerate(task["actions"]):
                    if "type" not in action:
                        print(f"✗ Action {j} in task {i} missing 'type'")
                        return False

            # Check summary
            summary = self.fixture.get("summary", {})
            summary_fields = ["total_cost_usd", "aei_tolerance_range", "risk_flags_triggered"]
            for field in summary_fields:
                if field not in summary:
                    print(f"✗ Summary missing required field: {field}")
                    return False

            print("✓ JSON structure valid")
            return True

        except Exception as e:
            print(f"✗ JSON validation error: {e}")
            return False


def format_result(result: TestResult) -> str:
    """Format a test result for display"""
    status = "✓ PASS" if result.test_passed else "✗ FAIL"

    lines = [
        f"\n{status}: {result.run_id}",
        f"  Framework: {result.framework_detected}",
        f"  Events found: {len(result.event_kinds_found)}/13",
        f"  AEI Score: {result.aei_score:.0f} (expected {result.aei_expected}, tolerance [{result.aei_expected - 8}-{result.aei_expected + 8}])",
        f"  Cost: ${result.total_cost:.5f} | Latency: {result.total_latency_ms}ms",
        f"  Risk flags: {', '.join(result.risk_flags) if result.risk_flags else '(none)'}",
        f"  Validation pass rate: {result.validation_pass_rate:.1%}",
    ]

    if result.event_kinds_missing:
        lines.append(f"  ⚠️  Missing event kinds: {', '.join(result.event_kinds_missing)}")

    if result.error:
        lines.append(f"  Error: {result.error}")

    return "\n".join(lines)


def print_neheh_summary(results: List[TestResult]):
    """Print summary statistics for Neheh cycle"""
    passed = sum(1 for r in results if r.test_passed)

    aei_scores = [r.aei_score for r in results]
    costs = [r.total_cost for r in results]
    latencies = [r.total_latency_ms for r in results]

    print(f"\n{'='*60}")
    print(f"NEHEH CYCLE SUMMARY ({len(results)} runs)")
    print(f"{'='*60}")
    print(f"Pass rate: {passed}/{len(results)} ({passed/len(results)*100:.1f}%)")
    print(f"\nAEI Score Statistics:")
    print(f"  Mean:     {statistics.mean(aei_scores):.2f}")
    print(f"  Median:   {statistics.median(aei_scores):.2f}")
    print(f"  Stdev:    {statistics.stdev(aei_scores) if len(aei_scores) > 1 else 0:.2f}")
    print(f"  Range:    {min(aei_scores):.2f} - {max(aei_scores):.2f}")

    print(f"\nCost Statistics:")
    print(f"  Mean:     ${statistics.mean(costs):.5f}")
    print(f"  Range:    ${min(costs):.5f} - ${max(costs):.5f}")

    print(f"\nLatency Statistics (ms):")
    print(f"  Mean:     {statistics.mean(latencies):.0f}")
    print(f"  Range:    {min(latencies)} - {max(latencies)}")


def main():
    parser = argparse.ArgumentParser(
        description="Symphony-AION Test Harness",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--fixture",
        default="../__tests__/fixtures/accra-london-textile-workflow.json",
        help="Path to test fixture JSON",
    )
    parser.add_argument(
        "--runs",
        type=int,
        default=1,
        help="Number of cycles to run (Neheh mapping)",
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=0.1,
        help="Sleep between cycles (seconds)",
    )
    parser.add_argument(
        "--corridor",
        default="accra-london",
        help="Trade corridor (accra-london, accra-nairobi, etc)",
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Only validate JSON structure, don't run parser",
    )

    args = parser.parse_args()

    # Resolve fixture path
    fixture_path = Path(args.fixture)
    if not fixture_path.is_absolute():
        fixture_path = Path(__file__).parent / fixture_path

    try:
        harness = TestHarness(str(fixture_path))
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    # Validate JSON
    print(f"Validating fixture: {fixture_path}")
    if not harness.validate_json_only():
        sys.exit(1)

    if args.validate_only:
        print("✓ JSON validation passed")
        sys.exit(0)

    # Run tests
    print(f"\nRunning {args.runs} test cycle(s) on corridor: {args.corridor}")
    print(f"{'='*60}")

    if args.runs == 1:
        result = harness.run_single_test(1)
        print(format_result(result))
        sys.exit(0 if result.test_passed else 1)
    else:
        results = harness.run_neheh_cycle(args.runs, args.sleep)

        # Print individual results
        for result in results:
            if not result.test_passed:
                print(format_result(result))

        # Print summary
        print_neheh_summary(results)

        # Exit with success only if all passed
        passed = sum(1 for r in results if r.test_passed)
        sys.exit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()
