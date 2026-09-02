#!/usr/bin/env python3
"""LegacyLift Contribution Points scorer.

Rules:
- XS=1, S=2, M=3, L=5, XL=8.
- Only merged PRs targeting main are eligible.
- The PR must be the actual latest ClosedEvent.closer for the issue.
- The issue must be CLOSED with stateReason COMPLETED.
- Size comes from the organization Issue Field named `Size`.
- S3B4S5C and bots are excluded.
- Awards are immutable and idempotent by repository + issue.
- Persistent state lives on the `contribution-points` branch.
"""

from __future__ import annotations

import argparse
import base64
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

METRICS_BRANCH = "contribution-points"
AWARDS_DIR = "metrics/awards"
LEADERBOARD_PATH = "metrics/leaderboard.json"
SUMMARY_PATH = "metrics/summary.json"

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

ELIGIBLE = "ELIGIBLE"
AWARDED = "AWARDED"
AWARDED_DRY_RUN = "AWARDED_DRY_RUN"


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
    allow_status: set[int] | None = None,
) -> tuple[Any, dict[str, str], int]:
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
            return data, response_headers, response.status
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        if allow_status and exc.code in allow_status:
            try:
                data = json.loads(error_body) if error_body else None
            except json.JSONDecodeError:
                data = None
            return data, {key: value for key, value in exc.headers.items()}, exc.code
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
        data, headers, _ = request_json(url)
        if not isinstance(data, list):
            raise RuntimeError(f"Expected list response while paginating {url}")
        items.extend(data)
        url = parse_next_link(headers.get("Link"))
    return items


def split_repo(repo: str) -> tuple[str, str]:
    owner, name = repo.split("/", 1)
    return owner, name


def repo_short(repo: str) -> str:
    return split_repo(repo)[1]


def fetch_pr(repo: str, pr_number: int) -> dict[str, Any]:
    data, _, _ = request_json(f"/repos/{repo}/pulls/{pr_number}")
    return data


def list_merged_prs(repo: str) -> list[dict[str, Any]]:
    closed = paginate(
        f"/repos/{repo}/pulls?state=closed&base=main&sort=created&direction=asc&per_page=100"
    )
    merged: list[dict[str, Any]] = []
    for stub in closed:
        detail = fetch_pr(repo, stub["number"])
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
    data = graphql(
        CLOSING_ISSUES_QUERY,
        {"owner": owner, "name": name, "number": pr_number},
    )
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
    data = graphql(
        ISSUE_CLOSURE_QUERY,
        {"owner": owner, "name": name, "number": issue_number},
    )
    return data["repository"]["issue"]


def issue_size(repo: str, issue_number: int) -> str | None:
    values, _, _ = request_json(
        f"/repos/{repo}/issues/{issue_number}/issue-field-values"
    )
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


def evaluate_pr(repo: str, pr: dict[str, Any]) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    user = pr.get("user") or {}
    author = user.get("login") or "unknown"
    author_lower = author.lower()
    author_type = (user.get("type") or "").lower()

    if not pr.get("merged_at") or pr.get("base", {}).get("ref") != "main":
        return [
            row(
                pr=pr,
                result="SKIPPED_NOT_MERGED_TO_MAIN",
                detail="PR is not merged to main",
            )
        ]

    if author_lower in EXCLUDED_AUTHORS:
        return [
            row(
                pr=pr,
                result="SKIPPED_EXCLUDED_AUTHOR",
                detail=f"PR author {author} is excluded from Contribution Points",
            )
        ]

    if author_type == "bot" or author_lower.endswith("[bot]"):
        return [
            row(
                pr=pr,
                result="SKIPPED_BOT",
                detail=f"PR author {author} is a bot",
            )
        ]

    references = closing_issues(repo, pr["number"])
    if not references:
        return [
            row(
                pr=pr,
                result="SKIPPED_NO_CLOSING_ISSUES",
                detail="GitHub reports no closingIssuesReferences for this PR",
            )
        ]

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
            and (closer.get("repository") or {}).get("nameWithOwner", "").lower()
            == repo.lower()
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

        results.append(
            row(
                pr=pr,
                issue=issue_number,
                issue_url=issue_url,
                size=size,
                points=POINTS[size],
                result=ELIGIBLE,
                detail="Eligible Contribution Points award",
            )
        )

    return results


def evaluate(repo: str, prs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for pr in prs:
        results.extend(evaluate_pr(repo, pr))
    return results


def award_path(repo: str, issue_number: int) -> str:
    return f"{AWARDS_DIR}/{repo_short(repo)}-{issue_number}.json"


def build_award(
    repo: str,
    item: dict[str, Any],
    *,
    source: str,
    awarded_at: str,
) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "type": "AWARD",
        "repository": repo,
        "issue": item["issue"],
        "issueUrl": item["issueUrl"],
        "pullRequest": item["pullRequest"],
        "pullRequestUrl": item["pullRequestUrl"],
        "author": item["author"],
        "size": item["size"],
        "points": item["points"],
        "mergedAt": item["mergedAt"],
        "awardedAt": awarded_at,
        "source": source,
    }


def get_branch_state(repo: str) -> tuple[str, str] | None:
    ref, _, status = request_json(
        f"/repos/{repo}/git/ref/heads/{METRICS_BRANCH}",
        allow_status={404},
    )
    if status == 404:
        return None
    commit_sha = ref["object"]["sha"]
    commit, _, _ = request_json(f"/repos/{repo}/git/commits/{commit_sha}")
    return commit_sha, commit["tree"]["sha"]


def ensure_metrics_branch(repo: str) -> tuple[str, str]:
    existing = get_branch_state(repo)
    if existing:
        return existing

    main_ref, _, _ = request_json(f"/repos/{repo}/git/ref/heads/main")
    main_sha = main_ref["object"]["sha"]
    _, _, status = request_json(
        f"/repos/{repo}/git/refs",
        method="POST",
        payload={
            "ref": f"refs/heads/{METRICS_BRANCH}",
            "sha": main_sha,
        },
        allow_status={422},
    )
    if status == 422:
        existing = get_branch_state(repo)
        if existing:
            return existing
        raise RuntimeError(f"Could not create {METRICS_BRANCH} branch")

    created = get_branch_state(repo)
    if not created:
        raise RuntimeError(f"{METRICS_BRANCH} branch was not visible after creation")
    return created


def decode_blob(blob: dict[str, Any]) -> str:
    encoding = blob.get("encoding")
    content = blob.get("content") or ""
    if encoding == "base64":
        return base64.b64decode(content.replace("\n", "")).decode("utf-8")
    return content


def read_awards(repo: str, tree_sha: str) -> dict[str, dict[str, Any]]:
    tree, _, _ = request_json(
        f"/repos/{repo}/git/trees/{tree_sha}?recursive=1"
    )
    if tree.get("truncated"):
        raise RuntimeError("Repository tree was truncated while reading metrics ledger")

    awards: dict[str, dict[str, Any]] = {}
    for item in tree.get("tree", []):
        path = item.get("path", "")
        if (
            item.get("type") == "blob"
            and path.startswith(f"{AWARDS_DIR}/")
            and path.endswith(".json")
        ):
            blob, _, _ = request_json(f"/repos/{repo}/git/blobs/{item['sha']}")
            awards[path] = json.loads(decode_blob(blob))
    return awards


def build_leaderboard(repo: str, awards: list[dict[str, Any]]) -> dict[str, Any]:
    contributors: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "points": 0,
            "issues": 0,
            "sizes": {size: 0 for size in POINTS},
        }
    )
    for award in awards:
        login = award["author"]
        size = award["size"]
        contributors[login]["points"] += int(award["points"])
        contributors[login]["issues"] += 1
        if size in contributors[login]["sizes"]:
            contributors[login]["sizes"][size] += 1

    rows = [{"login": login, **values} for login, values in contributors.items()]
    rows.sort(key=lambda item: (-item["points"], item["login"].lower()))

    return {
        "schemaVersion": 1,
        "repository": repo,
        "generatedAt": utc_now(),
        "totalPoints": sum(int(award["points"]) for award in awards),
        "awards": len(awards),
        "contributors": rows,
    }


def ledger_summary(repo: str, leaderboard: dict[str, Any]) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "repository": repo,
        "generatedAt": leaderboard["generatedAt"],
        "branch": METRICS_BRANCH,
        "points": POINTS,
        "excludedAuthors": sorted(EXCLUDED_AUTHORS),
        "awards": leaderboard["awards"],
        "totalPoints": leaderboard["totalPoints"],
    }


def commit_files(
    repo: str,
    *,
    parent_sha: str,
    base_tree_sha: str,
    files: dict[str, str],
    message: str,
) -> str:
    entries: list[dict[str, Any]] = []
    for path, content in files.items():
        blob, _, _ = request_json(
            f"/repos/{repo}/git/blobs",
            method="POST",
            payload={"content": content, "encoding": "utf-8"},
        )
        entries.append(
            {
                "path": path,
                "mode": "100644",
                "type": "blob",
                "sha": blob["sha"],
            }
        )

    tree, _, _ = request_json(
        f"/repos/{repo}/git/trees",
        method="POST",
        payload={"base_tree": base_tree_sha, "tree": entries},
    )
    commit, _, _ = request_json(
        f"/repos/{repo}/git/commits",
        method="POST",
        payload={
            "message": message,
            "tree": tree["sha"],
            "parents": [parent_sha],
        },
    )
    request_json(
        f"/repos/{repo}/git/refs/heads/{METRICS_BRANCH}",
        method="PATCH",
        payload={"sha": commit["sha"], "force": False},
    )
    return commit["sha"]


def dry_run_report(
    repo: str,
    results: list[dict[str, Any]],
    *,
    scanned: int,
) -> dict[str, Any]:
    projected_awards = []
    output_results = []
    now = utc_now()
    for item in results:
        current = dict(item)
        if current["result"] == ELIGIBLE:
            current["result"] = AWARDED_DRY_RUN
            current["detail"] = "Eligible historical award (dry run only)"
            projected_awards.append(
                build_award(repo, current, source="dry-run", awarded_at=now)
            )
        output_results.append(current)

    leaderboard = build_leaderboard(repo, projected_awards)
    return {
        "schemaVersion": 1,
        "mode": "dry-run",
        "repository": repo,
        "generatedAt": now,
        "points": POINTS,
        "excludedAuthors": sorted(EXCLUDED_AUTHORS),
        "mergedPullRequestsScanned": scanned,
        "results": output_results,
        "leaderboard": leaderboard["contributors"],
        "awards": leaderboard["awards"],
        "totalPoints": leaderboard["totalPoints"],
    }


def apply_results(
    repo: str,
    results: list[dict[str, Any]],
    *,
    source: str,
    scanned: int,
) -> dict[str, Any]:
    eligible = [item for item in results if item["result"] == ELIGIBLE]

    state = get_branch_state(repo)
    if not eligible and state is None:
        return {
            "schemaVersion": 1,
            "mode": "apply",
            "repository": repo,
            "generatedAt": utc_now(),
            "points": POINTS,
            "excludedAuthors": sorted(EXCLUDED_AUTHORS),
            "mergedPullRequestsScanned": scanned,
            "results": results,
            "awardsCreated": 0,
            "pointsAwardedThisRun": 0,
            "ledgerAwards": 0,
            "ledgerTotalPoints": 0,
            "leaderboard": [],
            "metricsCommit": None,
        }

    parent_sha, tree_sha = ensure_metrics_branch(repo)
    existing_by_path = read_awards(repo, tree_sha)

    output_results: list[dict[str, Any]] = []
    new_awards: dict[str, dict[str, Any]] = {}
    awarded_at = utc_now()

    for item in results:
        current = dict(item)
        if current["result"] != ELIGIBLE:
            output_results.append(current)
            continue

        path = award_path(repo, int(current["issue"]))
        if path in existing_by_path:
            existing = existing_by_path[path]
            current["result"] = "SKIPPED_ALREADY_AWARDED"
            current["points"] = 0
            current["detail"] = (
                f"Issue already awarded to @{existing.get('author')} "
                f"via PR #{existing.get('pullRequest')}"
            )
            output_results.append(current)
            continue

        award = build_award(repo, current, source=source, awarded_at=awarded_at)
        new_awards[path] = award
        current["result"] = AWARDED
        current["detail"] = "Contribution Points award persisted"
        output_results.append(current)

    combined_by_path = {**existing_by_path, **new_awards}
    leaderboard = build_leaderboard(repo, list(combined_by_path.values()))
    summary = ledger_summary(repo, leaderboard)

    files: dict[str, str] = {
        path: json.dumps(award, indent=2, ensure_ascii=False) + "\n"
        for path, award in new_awards.items()
    }
    files[LEADERBOARD_PATH] = (
        json.dumps(leaderboard, indent=2, ensure_ascii=False) + "\n"
    )
    files[SUMMARY_PATH] = json.dumps(summary, indent=2, ensure_ascii=False) + "\n"

    metrics_commit = None
    if new_awards or source == "backfill":
        metrics_commit = commit_files(
            repo,
            parent_sha=parent_sha,
            base_tree_sha=tree_sha,
            files=files,
            message=(
                "metrics: backfill contribution points"
                if source == "backfill"
                else f"metrics: score PR #{output_results[0]['pullRequest']}"
            ),
        )

    return {
        "schemaVersion": 1,
        "mode": "apply",
        "repository": repo,
        "generatedAt": utc_now(),
        "points": POINTS,
        "excludedAuthors": sorted(EXCLUDED_AUTHORS),
        "mergedPullRequestsScanned": scanned,
        "results": output_results,
        "awardsCreated": len(new_awards),
        "pointsAwardedThisRun": sum(
            award["points"] for award in new_awards.values()
        ),
        "ledgerAwards": leaderboard["awards"],
        "ledgerTotalPoints": leaderboard["totalPoints"],
        "leaderboard": leaderboard["contributors"],
        "metricsCommit": metrics_commit,
    }


def markdown(report: dict[str, Any]) -> str:
    dry = report["mode"] == "dry-run"
    title = "Contribution Points — Dry Run" if dry else "Contribution Points"
    lines = [
        f"# {title}",
        "",
        f"Repository: `{report['repository']}`  ",
        f"Generated: `{report['generatedAt']}`  ",
        f"Merged PRs scanned: **{report['mergedPullRequestsScanned']}**  ",
    ]
    if dry:
        lines += [
            f"Eligible awards: **{report['awards']}**  ",
            f"Total eligible points: **{report['totalPoints']}**",
        ]
    else:
        lines += [
            f"Awards created this run: **{report['awardsCreated']}**  ",
            f"Points awarded this run: **{report['pointsAwardedThisRun']}**  ",
            f"Ledger awards: **{report['ledgerAwards']}**  ",
            f"Ledger total points: **{report['ledgerTotalPoints']}**",
        ]
        if report.get("metricsCommit"):
            lines.append(f"Metrics commit: `{report['metricsCommit']}`")

    lines += [
        "",
        "## Results",
        "",
        "| PR | Author | Issue | Size | Points | Result | Detail |",
        "|---:|---|---:|:---:|---:|---|---|",
    ]

    def safe(value: Any) -> str:
        return (
            str(value if value is not None else "—")
            .replace("|", "\\|")
            .replace("\n", " ")
        )

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

    lines += [
        "",
        "## Leaderboard" if not dry else "## Dry-run leaderboard",
        "",
    ]
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
        lines.append("No Contribution Points awards exist for this scope.")

    if dry:
        lines += [
            "",
            "> Dry run only: no awards, leaderboard state, issues, pull requests, or branches were modified.",
        ]
    else:
        lines += [
            "",
            f"> Persistent ledger: branch `{METRICS_BRANCH}`.",
        ]
    lines.append("")
    return "\n".join(lines)


def write_report(report: dict[str, Any], prefix: str) -> None:
    Path(f"{prefix}.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    md = markdown(report)
    Path(f"{prefix}.md").write_text(md, encoding="utf-8")
    print(md)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["backfill", "score-pr"])
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--apply", action="store_true")
    parser.add_argument("--pr-number", type=int)
    parser.add_argument("--repository", default=os.environ.get("GITHUB_REPOSITORY"))
    args = parser.parse_args()

    if not args.repository:
        parser.error("--repository or GITHUB_REPOSITORY is required")

    if args.command == "backfill":
        if not args.dry_run and not args.apply:
            parser.error("backfill requires --dry-run or --apply")
        prs = list_merged_prs(args.repository)
        results = evaluate(args.repository, prs)
        if args.dry_run:
            report = dry_run_report(
                args.repository,
                results,
                scanned=len(prs),
            )
            write_report(report, "contribution-points-dry-run")
        else:
            report = apply_results(
                args.repository,
                results,
                source="backfill",
                scanned=len(prs),
            )
            write_report(report, "contribution-points-backfill")
        return 0

    if args.command == "score-pr":
        if args.pr_number is None:
            parser.error("score-pr requires --pr-number")
        if args.dry_run:
            parser.error("score-pr is the persistent scoring command; do not use --dry-run")
        pr = fetch_pr(args.repository, args.pr_number)
        results = evaluate_pr(args.repository, pr)
        report = apply_results(
            args.repository,
            results,
            source="pull_request_target",
            scanned=1,
        )
        write_report(report, "contribution-points-score")
        return 0

    parser.error("Unsupported command")
    return 2


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
