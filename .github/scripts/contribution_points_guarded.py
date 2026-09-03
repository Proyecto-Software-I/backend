#!/usr/bin/env python3
"""Tamper-resistant entrypoint for LegacyLift Contribution Points.

This wrapper preserves the existing scorer behavior but replaces the live `Size`
lookup with an audited, frozen value derived from the issue timeline.

Policy:
- The canonical field is the organization Issue Field named `Size`.
- S3B4S5C is the only human allowed to establish the scoring size.
- The one-time legacy size migration performed by github-actions[bot] before the
  cutoff is trusted so existing backend/frontend issues keep their current score.
- The first valid trusted Size value is immutable for scoring.
- Later edits/removals remain visible in GitHub but cannot increase/decrease points.
- Current Size is still read for audit output; it is never trusted for scoring.

The existing scorer remains the source of truth for eligibility, closure semantics,
points, exclusions, persistence, and leaderboard generation.
"""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any

import contribution_points as core

SIZE_FIELD_NAME = "Size"
AUTHORIZED_SIZE_SETTERS = {"s3b4s5c"}
LEGACY_AUTOMATION_SETTERS = {"github-actions[bot]", "github-actions"}
LEGACY_AUTOMATION_CUTOFF = "2026-09-03T00:00:00Z"
CURRENT_SIZE_LOOKUP = core.issue_size

SIZE_HISTORY_QUERY = """
query($owner: String!, $name: String!, $number: Int!, $after: String) {
  repository(owner: $owner, name: $name) {
    issue(number: $number) {
      timelineItems(first: 100, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          __typename
          ... on IssueFieldAddedEvent {
            createdAt
            actor { login }
            issueField {
              __typename
              ... on IssueFieldSingleSelect { name }
            }
            options { name }
            value
          }
          ... on IssueFieldChangedEvent {
            createdAt
            actor { login }
            issueField {
              __typename
              ... on IssueFieldSingleSelect { name }
            }
            newOptions { name }
            newValue
          }
          ... on IssueFieldRemovedEvent {
            createdAt
            actor { login }
            issueField {
              __typename
              ... on IssueFieldSingleSelect { name }
            }
            options { name }
          }
        }
      }
    }
  }
}
"""


def _field_name(event: dict[str, Any]) -> str | None:
    field = event.get("issueField") or {}
    return field.get("name")


def _event_size(event: dict[str, Any]) -> str | None:
    kind = event.get("__typename")
    if kind == "IssueFieldAddedEvent":
        options = event.get("options") or []
        if options:
            return options[0].get("name")
        return event.get("value")
    if kind == "IssueFieldChangedEvent":
        options = event.get("newOptions") or []
        if options:
            return options[0].get("name")
        return event.get("newValue")
    return None


def _event_is_trusted(event: dict[str, Any]) -> bool:
    actor = ((event.get("actor") or {}).get("login") or "").lower()
    created_at = event.get("createdAt") or ""
    if actor in AUTHORIZED_SIZE_SETTERS:
        return True
    return (
        actor in LEGACY_AUTOMATION_SETTERS
        and bool(created_at)
        and created_at < LEGACY_AUTOMATION_CUTOFF
    )


def size_history(repo: str, issue_number: int) -> list[dict[str, Any]]:
    owner, name = core.split_repo(repo)
    after: str | None = None
    events: list[dict[str, Any]] = []

    while True:
        data = core.graphql(
            SIZE_HISTORY_QUERY,
            {
                "owner": owner,
                "name": name,
                "number": issue_number,
                "after": after,
            },
        )
        issue = (data.get("repository") or {}).get("issue")
        if not issue:
            return []

        timeline = issue.get("timelineItems") or {}
        for node in timeline.get("nodes") or []:
            if not node or _field_name(node) != SIZE_FIELD_NAME:
                continue
            if node.get("__typename") not in {
                "IssueFieldAddedEvent",
                "IssueFieldChangedEvent",
                "IssueFieldRemovedEvent",
            }:
                continue
            events.append(node)

        page_info = timeline.get("pageInfo") or {}
        if not page_info.get("hasNextPage"):
            break
        after = page_info.get("endCursor")
        if not after:
            break

    events.sort(key=lambda item: item.get("createdAt") or "")
    return events


def frozen_size_evidence(repo: str, issue_number: int) -> dict[str, Any]:
    events = size_history(repo, issue_number)
    frozen_event: dict[str, Any] | None = None
    frozen_size: str | None = None

    for event in events:
        if not _event_is_trusted(event):
            continue
        candidate = _event_size(event)
        if candidate in core.POINTS:
            frozen_event = event
            frozen_size = candidate
            break

    current_size = CURRENT_SIZE_LOOKUP(repo, issue_number)
    current_valid = current_size in core.POINTS if current_size is not None else False

    return {
        "repository": repo,
        "issue": issue_number,
        "field": SIZE_FIELD_NAME,
        "authorizedHumanSetters": sorted(AUTHORIZED_SIZE_SETTERS),
        "legacyAutomationSetters": sorted(LEGACY_AUTOMATION_SETTERS),
        "legacyAutomationCutoff": LEGACY_AUTOMATION_CUTOFF,
        "frozenSize": frozen_size,
        "frozenPoints": core.POINTS.get(frozen_size) if frozen_size else None,
        "frozenBy": (
            ((frozen_event or {}).get("actor") or {}).get("login")
            if frozen_event
            else None
        ),
        "frozenAt": (frozen_event or {}).get("createdAt") if frozen_event else None,
        "currentSize": current_size,
        "currentValid": current_valid,
        "matchesFrozen": frozen_size is not None and current_size == frozen_size,
        "sizeEvents": len(events),
    }


def protected_issue_size(repo: str, issue_number: int) -> str | None:
    evidence = frozen_size_evidence(repo, issue_number)
    frozen = evidence["frozenSize"]
    current = evidence["currentSize"]

    if frozen is None:
        print(
            f"SIZE_GUARD issue #{issue_number}: no trusted frozen Size exists; "
            "the issue is not eligible for points",
            file=sys.stderr,
        )
        return None

    if current != frozen:
        print(
            f"SIZE_GUARD WARNING issue #{issue_number}: current Size={current or 'NONE'} "
            f"differs from frozen Size={frozen}; scoring uses frozen Size={frozen}",
            file=sys.stderr,
        )
    else:
        print(
            f"SIZE_GUARD issue #{issue_number}: frozen Size={frozen} "
            f"by @{evidence['frozenBy']} at {evidence['frozenAt']}",
            file=sys.stderr,
        )

    return frozen


def audit_size(repo: str, issue_number: int) -> int:
    evidence = frozen_size_evidence(repo, issue_number)
    print(json.dumps(evidence, indent=2, ensure_ascii=False))

    if evidence["frozenSize"] is None:
        print(
            f"::error title=Contribution Points Size guard::Issue #{issue_number} "
            "has no Size established by a trusted setter.",
            file=sys.stderr,
        )
        return 1

    if not evidence["matchesFrozen"]:
        print(
            f"::error title=Contribution Points Size tampering::Issue #{issue_number} "
            f"is currently {evidence['currentSize'] or 'unset'}, but scoring is frozen "
            f"at {evidence['frozenSize']}. The edit will not change awarded points.",
            file=sys.stderr,
        )
        return 1

    return 0


def audit_cli(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Audit frozen Contribution Points Size")
    parser.add_argument("audit-size")
    parser.add_argument("--issue-number", type=int, required=True)
    parser.add_argument("--repository", required=True)
    args = parser.parse_args(argv)
    return audit_size(args.repository, args.issue_number)


def main() -> int:
    if len(sys.argv) > 1 and sys.argv[1] == "audit-size":
        return audit_cli(sys.argv[1:])

    core.issue_size = protected_issue_size
    return core.main()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
