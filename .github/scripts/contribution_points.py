#!/usr/bin/env python3
"""Dry-run scorer for LegacyLift Contribution Points.

This script intentionally does not write awards. It reconstructs merged PR ->
closing issue relationships, verifies the PR was the actual issue closer, reads
Organization Issue Field `Size`, excludes configured authors/bots, and produces
JSON + Markdown reports for review before enabling persistent scoring.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REST_API = "https://api.github.com"
GRAPHQL_API = "https://api.github.com/graphql"
API_VERSION = "2026-03-10"

POINTS = {
    "XS": 1,
    "S": 2,
    "M": 3,
    "L": 5,
    "XL": 8,
}

EXCLUDED_AUTHORS = {
    "s3b4s5c",
}

RESULT_AWARDED = "AWARDED_DRY_RUN"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def token() -> str:
    value = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if not value:
        raise RuntimeError("GITHUB_TOKEN or GH_TOKEN is required")
    return value


def request_json(
    url_or_path: str,
    *,
    method: str = "GET",
    payload: dict[str, Any] | None = None,
) -> tuple[Any, dict[str, str]]:
    url = url_or_path if url_or_path.startswith("http") else f"{REST_API}{url_or_path}"
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token()}",
        "X-GitHub-Api-Version": API_VERSION,
        "User-Agent": "legacylift-contribution-points",
    }
    if body is not None:
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8")
            data = json.loads(raw) if raw else None
            response_headers = {key: value for key, value in response.headers.items()}
            return data, response_headers
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"GitHub API {exc.code} for {url}: {error_body}") from exc


def graphql(query: str, variables: dict[str, Any]) -> dict[str, Any]:
    body = json.dumps({"query": query, "variables": variables}).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {token()}",
        "Content-Type": "application/json",
        "User-Agent": "legacylift-contribution-points",
    }
    request = urllib.request.Request(GRAPHQL_API, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"GitHub GraphQL {exc.code}: {error_body}") from exc

    if data.get("errors"):
        raise RuntimeError(f"GitHub GraphQL errors: {json.dumps(data['errors'])}")
    return data["data"]


def parse_next_link(link_header: str | None) -> str | None:
    if not link_header:
        return None
    for part in link_header.split(","):
        match = re.match(r'\s*<([^>]+)>;\s*rel="([^"]+)"', part)
        if match and match.group(2) == "next":
            return match.group(1)
    return None


def paginate(path: str) -> list[Any]:
    items: list[Any] = []
    url: str | None = path
    while url:
        data, headers = request_json(url)
        if not isinstance(data, list):
            raise RuntimeError(f"Expected list response while paginating {url}")
        items.extend(data)
        url = parse_next_link(headers.get("Link"))
    return items


def split_repo(repo: str) -> tuple[str, str]:
    owner, name = repo.split("/", 1)
    return owner, name


def list_merged_prs(repo: str) -> list[dict[str, Any]]:
    closed = paginate(f"/repos/{repo}/pulls?state=closed&base=main&sort=created&direction=asc&per_page=100")
    merged: list[dict[str, Any]] = []
    for stub in closed:
        detail, _ = request_json(f"/repos/{repo}/pulls/{stub['number']}")
        if detail.get("merged_at") and detail.get("base", {}).get("ref") == "main":
            merged.append(detail)
    return merged


CLOSING_ISSUES_QUERY = """
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      closingIssuesReferences(first: 100) {
        nodes {
          number
          url
          state
          repository { nameWithOwner }
        }
      }
    }
  }
}
"""


def closing_issues(repo: str, pr_number: int) -> list[dict[str, Any]]:
    owner, name = split_repo(repo)
    data = graphql(CLOSING_ISSUES_QUERY, {"owner": owner, "name": name, "number": pr_number})
    pr = data["repository"]["pullRequest"]
    return pr["closingIssuesReferences"]["nodes"] if pr else []


ISSUE_CLOSURE_QUERY = """
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    issue(number: $number) {
      number
      url
      state
      stateReason
      timelineItems(last: 100, itemTypes: [CLOSED_EVENT]) {
        nodes {
          ... on ClosedEvent {
            createdAt
            closer {
              __typename
              ... on PullRequest {
                number
                repository { nameWithOwner }
              }
            }
          }
        }
      }
    }
  }
}
"""


def issue_closure(repo: str, issue_number: int) -> dict[str, Any] | None:
    owner, name = split_repo(repo)
    data = graphql(ISSUE_CLOSURE_QUERY, {"owner": owner, "name": name, "number": issue_number})
    return data["repository"]["issue"]


def issue_size(repo: str, issue_number: int) -> str | None:
    values, _ = request_json(f"/repos/{repo}/issues/{issue_number}/issue-field-values")
    for value in values:
        if value.get("issue_field_name") == "Size":
            option = value.get("single_select_option") or {}
            return option.get("name")
    return None


def latest_close_event(issue: dict[str, Any]) -> dict[str, Any] | None:
    nodes = issue.get("timelineItems", {}).get("nodes", [])
    events = [node for node in nodes if node and node.get("createdAt")]
    if not events:
        return None
    return max(events, key=lambda item: item["createdAt"])


def row(
    *,
    pr: dict[str, Any],
    result: str,
    detail: str,
    issue: int | None = None,
    issue_url: str | None = None,
    size: str | None = None,
    points: int = 0,
) -> dict[str, Any]:
    user = pr.get("user") or {}
    return {
        "pullRequest": pr["number"],
        "pullRequestUrl": pr.get("html_url"),
        "author": user.get("login") or "unknown",
        "authorType": user.get("type"),
        "mergedAt": pr.get("merged_at"),
        "issue": issue,
        "issueUrl": issue_url,
        "size": size,
        "points": points,
        "result": result,
        "detail": detail,
    }


def evaluate(repo: str) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
    leaderboard: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "points": 0,
            "issues": 0,
            "sizes": {size: 0 for size in POINTS},
        }
    )

    prs = list_merged_prs(repo)
    for pr in prs:
        user = pr.get("user") or {}
        author = user.get("login") or "unknown"
        author_lower = author.lower()
        author_type = (user.get("type") or "").lower()

        if author_lower in EXCLUDED_AUTHORS:
            results.append(
                row(
                    pr=pr,
                    result="SKIPPED_EXCLUDED_AUTHOR",
                    detail=f"PR author {author} is excluded from Contribution Points",
                )
            )
            continue

        if author_type == "bot" or author_lower.endswith("[bot]"):
            results.append(
                row(
                    pr=pr,
                    result="SKIPPED_BOT",
                    detail=f"PR author {author} is a bot",
                )
            )
            continue

        references = closing_issues(repo, pr["number"])
        if not references:
            results.append(
                row(
                    pr=pr,
                    result="SKIPPED_NO_CLOSING_ISSUES",
                    detail="GitHub reports no closingIssuesReferences for this PR",
                )
            )
            continue

        for reference in references:
            issue_repo = reference["repository"]["nameWithOwner"]
            issue_number = reference["number"]
            issue_url = reference.get("url")

            if issue_repo.lower() != repo.lower():
                results.append(
                    row(
                        pr=pr,
                        issue=issue_number,
                        issue_url=issue_url,
                        result="SKIPPED_CROSS_REPO_ISSUE",
                        detail=f"Closing issue belongs to {issue_repo}; score it in that repository",
                    )
                )
                continue

            issue = issue_closure(repo, issue_number)
            if not issue or issue.get("state") != "CLOSED":
                results.append(
                    row(
                        pr=pr,
                        issue=issue_number,
                        issue_url=issue_url,
                        result="SKIPPED_ISSUE_NOT_CLOSED",
                        detail="Issue is not currently closed",
                    )
                )
                continue

            if issue.get("stateReason") != "COMPLETED":
                results.append(
                    row(
                        pr=pr,
                        issue=issue_number,
                        issue_url=issue_url,
                        result="SKIPPED_NOT_COMPLETED",
                        detail=f"Issue stateReason is {issue.get('stateReason')}",
                    )
                )
                continue

            close_event = latest_close_event(issue)
            closer = (close_event or {}).get("closer") or {}
            closer_matches = (
                closer.get("__typename") == "PullRequest"
                and closer.get("number") == pr["number"]
                and (closer.get("repository") or {}).get("nameWithOwner", "").lower() == repo.lower()
            )
            if not closer_matches:
                closer_text = closer.get("__typename") or "none"
                if closer.get("number"):
                    closer_text += f" #{closer['number']}"
                results.append(
                    row(
                        pr=pr,
                        issue=issue_number,
                        issue_url=issue_url,
                        result="SKIPPED_NOT_CLOSED_BY_THIS_PR",
                        detail=f"Latest ClosedEvent closer is {closer_text}",
                    )
                )
                continue

            size = issue_size(repo, issue_number)
            if size is None:
                results.append(
                    row(
                        pr=pr,
                        issue=issue_number,
                        issue_url=issue_url,
                        result="SKIPPED_NO_SIZE",
                        detail="Issue has no Organization Issue Field named Size",
                    )
                )
                continue

            if size not in POINTS:
                results.append(
                    row(
                        pr=pr,
                        issue=issue_number,
                        issue_url=issue_url,
                        size=size,
                        result="SKIPPED_INVALID_SIZE",
                        detail=f"Unsupported Size value: {size}",
                    )
                )
                continue

            points = POINTS[size]
            results.append(
                row(
                    pr=pr,
                    issue=issue_number,
                    issue_url=issue_url,
                    size=size,
                    points=points,
                    result=RESULT_AWARDED,
                    detail="Eligible historical award (dry run only)",
                )
            )
            leaderboard[author]["points"] += points
            leaderboard[author]["issues"] += 1
            leaderboard[author]["sizes"][size] += 1

    leaderboard_rows = [
        {"login": login, **values}
        for login, values in leaderboard.items()
    ]
    leaderboard_rows.sort(key=lambda item: (-item["points"], item["login"].lower()))

    return {
        "schemaVersion": 1,
        "mode": "dry-run",
        "repository": repo,
        "generatedAt": utc_now(),
        "points": POINTS,
        "excludedAuthors": sorted(EXCLUDED_AUTHORS),
        "mergedPullRequestsScanned": len(prs),
        "results": results,
        "leaderboard": leaderboard_rows,
        "awards": sum(1 for item in results if item["result"] == RESULT_AWARDED),
        "totalPoints": sum(item["points"] for item in results if item["result"] == RESULT_AWARDED),
    }


def markdown(report: dict[str, Any]) -> str:
    lines = [
        "# Contribution Points — Dry Run",
        "",
        f"Repository: `{report['repository']}`  ",
        f"Generated: `{report['generatedAt']}`  ",
        f"Merged PRs scanned: **{report['mergedPullRequestsScanned']}**  ",
        f"Eligible awards: **{report['awards']}**  ",
        f"Total eligible points: **{report['totalPoints']}**",
        "",
        "## Results",
        "",
        "| PR | Author | Issue | Size | Points | Result | Detail |",
        "|---:|---|---:|:---:|---:|---|---|",
    ]

    def safe(value: Any) -> str:
        return str(value if value is not None else "—").replace("|", "\\|").replace("\n", " ")

    for item in report["results"]:
        lines.append(
            "| "
            + " | ".join(
                [
                    f"#{item['pullRequest']}",
                    f"@{safe(item['author'])}",
                    f"#{item['issue']}" if item["issue"] is not None else "—",
                    safe(item["size"]),
                    str(item["points"]),
                    safe(item["result"]),
                    safe(item["detail"]),
                ]
            )
            + " |"
        )

    lines += ["", "## Dry-run leaderboard", ""]
    if report["leaderboard"]:
        lines += [
            "| Rank | Contributor | Points | Issues | XS | S | M | L | XL |",
            "|---:|---|---:|---:|---:|---:|---:|---:|---:|",
        ]
        for index, item in enumerate(report["leaderboard"], start=1):
            sizes = item["sizes"]
            lines.append(
                f"| {index} | @{item['login']} | {item['points']} | {item['issues']} | "
                f"{sizes['XS']} | {sizes['S']} | {sizes['M']} | {sizes['L']} | {sizes['XL']} |"
            )
    else:
        lines.append("No eligible historical awards were found.")

    lines += [
        "",
        "> Dry run only: no awards, leaderboard state, issues, pull requests, or branches were modified.",
        "",
    ]
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["backfill"])
    parser.add_argument("--dry-run", action="store_true", required=False)
    parser.add_argument("--repository", default=os.environ.get("GITHUB_REPOSITORY"))
    args = parser.parse_args()

    if args.command != "backfill" or not args.dry_run:
        parser.error("Only `backfill --dry-run` is enabled before historical results are approved")
    if not args.repository:
        parser.error("--repository or GITHUB_REPOSITORY is required")

    report = evaluate(args.repository)
    json_path = Path("contribution-points-dry-run.json")
    md_path = Path("contribution-points-dry-run.md")
    json_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    md = markdown(report)
    md_path.write_text(md, encoding="utf-8")
    print(md)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001 - workflow should expose actionable API failures
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
