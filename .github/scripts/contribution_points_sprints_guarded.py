#!/usr/bin/env python3
"""Sprint-aware Contribution Points entrypoint with immutable Size protection."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

SPRINT_SPEC = importlib.util.spec_from_file_location(
    "contribution_points_sprints_core",
    HERE / "contribution_points_sprints.py",
)
if SPRINT_SPEC is None or SPRINT_SPEC.loader is None:
    raise RuntimeError("Could not load contribution_points_sprints.py")
sprints = importlib.util.module_from_spec(SPRINT_SPEC)
SPRINT_SPEC.loader.exec_module(sprints)

GUARD_SPEC = importlib.util.spec_from_file_location(
    "contribution_points_size_guard",
    HERE / "contribution_points_guarded.py",
)
if GUARD_SPEC is None or GUARD_SPEC.loader is None:
    raise RuntimeError("Could not load contribution_points_guarded.py")
guard = importlib.util.module_from_spec(GUARD_SPEC)
GUARD_SPEC.loader.exec_module(guard)

# contribution_points_sprints.py loads its own core module instance. Patch exactly
# the function used by that instance during evaluate/evaluate_pr.
sprints.core.issue_size = guard.protected_issue_size


if __name__ == "__main__":
    try:
        raise SystemExit(sprints.main())
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
