#!/usr/bin/env python3
"""Sprint-aware persistence and web views for Contribution Points.

Eligibility remains in contribution_points.py. This layer freezes sprint assignment
on each award and derives API-ready leaderboard documents from the immutable ledger.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("contribution_points_core", HERE / "contribution_points.py")
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Could not load contribution_points.py")
core = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(core)

CONFIG_FILE = HERE.parent / "contribution-points" / "sprints.json"
ALL_TIME = "metrics/all-time.json"
CURRENT = "metrics/current.json"
INDEX = "metrics/index.json"
CONFIG = "metrics/config.json"
SPRINTS_DIR = "metrics/sprints"
CONTRIBUTORS_DIR = "metrics/contributors"


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def dt(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise RuntimeError(f"Timestamp must include timezone: {value}")
    return parsed.astimezone(timezone.utc)


def load_config() -> dict[str, Any]:
    cfg = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    previous_end = None
    ids: set[str] = set()
    for sprint in cfg.get("sprints", []):
        if sprint["id"] in ids:
            raise RuntimeError(f"Duplicate sprint id: {sprint['id']}")
        ids.add(sprint["id"])
        start, end = dt(sprint["start"]), dt(sprint["end"])
        if end <= start or (previous_end and start < previous_end):
            raise RuntimeError(f"Invalid sprint interval: {sprint['id']}")
        previous_end = end
    if not ids:
        raise RuntimeError("No sprints configured")
    return cfg


def sprint_public(s: dict[str, Any]) -> dict[str, Any]:
    return {key: s.get(key) for key in ("id", "number", "name", "start", "end")}


def sprint_at(cfg: dict[str, Any], timestamp: str | None) -> dict[str, Any] | None:
    if not timestamp:
        return None
    moment = dt(timestamp)
    return next(
        (s for s in cfg["sprints"] if dt(s["start"]) <= moment < dt(s["end"])),
        None,
    )


def status(s: dict[str, Any], timestamp: str) -> str:
    moment = dt(timestamp)
    if moment < dt(s["start"]):
        return "upcoming"
    if moment >= dt(s["end"]):
        return "completed"
    return "active"


def build_award(repo: str, item: dict[str, Any], source: str, awarded_at: str, cfg: dict[str, Any]) -> dict[str, Any]:
    award = core.build_award(repo, item, source=source, awarded_at=awarded_at)
    sprint = sprint_at(cfg, item.get("mergedAt"))
    award["schemaVersion"] = 2
    award["sprint"] = sprint_public(sprint) if sprint else None
    award["sprintAssignment"] = "mergedAt" if sprint else "outside-configured-sprints"
    return award


def aggregate(awards: list[dict[str, Any]]) -> list[dict[str, Any]]:
    people: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"points": 0, "issues": 0, "sizes": {size: 0 for size in core.POINTS}}
    )
    for award in awards:
        person = people[award["author"]]
        person["points"] += int(award["points"])
        person["issues"] += 1
        if award["size"] in person["sizes"]:
            person["sizes"][award["size"]] += 1
    rows = [{"login": login, **data} for login, data in people.items()]
    return sorted(rows, key=lambda x: (-x["points"], x["login"].lower()))


def board(repo: str, awards: list[dict[str, Any]], generated: str, scope: str, sprint=None) -> dict[str, Any]:
    return {
        "schemaVersion": 2,
        "repository": repo,
        "scope": scope,
        "generatedAt": generated,
        "sprint": sprint_public(sprint) if sprint else None,
        "totalPoints": sum(int(a["points"]) for a in awards),
        "awards": len(awards),
        "contributors": aggregate(awards),
    }


def web_files(repo: str, awards: list[dict[str, Any]], cfg: dict[str, Any]) -> dict[str, str]:
    generated = now()
    active = sprint_at(cfg, generated)
    files: dict[str, str] = {}
    all_time = board(repo, awards, generated, "all-time")
    encoded_all = json.dumps(all_time, indent=2, ensure_ascii=False) + "\n"
    files[core.LEADERBOARD_PATH] = encoded_all
    files[ALL_TIME] = encoded_all

    sprint_index = []
    for sprint in cfg["sprints"]:
        scoped = [a for a in awards if (a.get("sprint") or {}).get("id") == sprint["id"]]
        doc = board(repo, scoped, generated, "sprint", sprint)
        doc["status"] = status(sprint, generated)
        path = f"{SPRINTS_DIR}/{sprint['id']}.json"
        files[path] = json.dumps(doc, indent=2, ensure_ascii=False) + "\n"
        sprint_index.append(
            {
                **sprint_public(sprint),
                "status": doc["status"],
                "points": doc["totalPoints"],
                "awards": doc["awards"],
                "path": path,
            }
        )

    active_awards = [a for a in awards if active and (a.get("sprint") or {}).get("id") == active["id"]]
    current = board(repo, active_awards, generated, "current-sprint", active)
    current["active"] = active is not None
    files[CURRENT] = json.dumps(current, indent=2, ensure_ascii=False) + "\n"

    public_cfg = {
        "schemaVersion": 2,
        "repository": repo,
        "timezone": cfg.get("timezone"),
        "scoringTimestamp": cfg.get("scoringTimestamp"),
        "intervalSemantics": cfg.get("intervalSemantics"),
        "points": core.POINTS,
        "sprints": [sprint_public(s) for s in cfg["sprints"]],
        "hardening": cfg.get("hardening"),
        "releaseCandidate": cfg.get("releaseCandidate"),
        "presentation": cfg.get("presentation"),
    }
    files[CONFIG] = json.dumps(public_cfg, indent=2, ensure_ascii=False) + "\n"

    summary = {
        "schemaVersion": 2,
        "repository": repo,
        "generatedAt": generated,
        "branch": core.METRICS_BRANCH,
        "points": core.POINTS,
        "excludedAuthors": sorted(core.EXCLUDED_AUTHORS),
        "awards": all_time["awards"],
        "totalPoints": all_time["totalPoints"],
        "currentSprint": sprint_public(active) if active else None,
    }
    files[core.SUMMARY_PATH] = json.dumps(summary, indent=2, ensure_ascii=False) + "\n"

    index = {
        "schemaVersion": 2,
        "repository": repo,
        "generatedAt": generated,
        "currentSprint": sprint_public(active) if active else None,
        "resources": {
            "allTime": ALL_TIME,
            "current": CURRENT,
            "config": CONFIG,
            "summary": core.SUMMARY_PATH,
            "sprints": {s["id"]: f"{SPRINTS_DIR}/{s['id']}.json" for s in cfg["sprints"]},
        },
        "sprints": sprint_index,
    }
    files[INDEX] = json.dumps(index, indent=2, ensure_ascii=False) + "\n"

    for login in sorted({a["author"] for a in awards}, key=str.lower):
        mine = [a for a in awards if a["author"] == login]
        breakdown = []
        for sprint in cfg["sprints"]:
            scoped = [a for a in mine if (a.get("sprint") or {}).get("id") == sprint["id"]]
            breakdown.append(
                {
                    **sprint_public(sprint),
                    "points": sum(int(a["points"]) for a in scoped),
                    "awards": len(scoped),
                    "issues": [a["issue"] for a in scoped],
                }
            )
        doc = {
            "schemaVersion": 2,
            "repository": repo,
            "generatedAt": generated,
            "login": login,
            "points": sum(int(a["points"]) for a in mine),
            "issues": len(mine),
            "sizes": next((x["sizes"] for x in aggregate(mine) if x["login"] == login), {s: 0 for s in core.POINTS}),
            "sprints": breakdown,
            "awards": sorted(mine, key=lambda a: (a.get("mergedAt") or "", int(a["issue"]))),
        }
        files[f"{CONTRIBUTORS_DIR}/{login}.json"] = json.dumps(doc, indent=2, ensure_ascii=False) + "\n"
    return files


def apply(repo: str, results: list[dict[str, Any]], source: str, scanned: int) -> dict[str, Any]:
    cfg = load_config()
    state = core.get_branch_state(repo)
    if state is None and not any(x["result"] == core.ELIGIBLE for x in results):
        return {
            "schemaVersion": 2,
            "mode": "apply",
            "repository": repo,
            "generatedAt": now(),
            "results": results,
            "awardsCreated": 0,
            "pointsAwardedThisRun": 0,
            "ledgerAwards": 0,
            "ledgerTotalPoints": 0,
            "leaderboard": [],
            "metricsCommit": None,
            "mergedPullRequestsScanned": scanned,
        }

    parent, tree = core.ensure_metrics_branch(repo)
    existing = core.read_awards(repo, tree)
    changed: dict[str, dict[str, Any]] = {}
    output = []
    awarded_at = now()

    for item in results:
        current = dict(item)
        if current["result"] != core.ELIGIBLE:
            output.append(current)
            continue
        path = core.award_path(repo, int(current["issue"]))
        if path in existing:
            old = existing[path]
            current.update(
                result="SKIPPED_ALREADY_AWARDED",
                points=0,
                detail=f"Issue already awarded to @{old.get('author')} via PR #{old.get('pullRequest')}",
            )
            output.append(current)
            continue
        award = build_award(repo, current, source, awarded_at, cfg)
        changed[path] = award
        existing[path] = award
        current["result"] = core.AWARDED
        current["detail"] = (
            f"Contribution Points award persisted in {award['sprint']['id']}"
            if award["sprint"]
            else "Contribution Points award persisted outside configured sprints"
        )
        output.append(current)

    files = {p: json.dumps(a, indent=2, ensure_ascii=False) + "\n" for p, a in changed.items()}
    files.update(web_files(repo, list(existing.values()), cfg))
    commit = core.commit_files(
        repo,
        parent_sha=parent,
        base_tree_sha=tree,
        files=files,
        message="metrics: backfill contribution points" if source == "backfill" else f"metrics: score PR #{results[0]['pullRequest']}",
    )
    all_time = json.loads(files[ALL_TIME])
    return {
        "schemaVersion": 2,
        "mode": "apply",
        "repository": repo,
        "generatedAt": now(),
        "points": core.POINTS,
        "excludedAuthors": sorted(core.EXCLUDED_AUTHORS),
        "mergedPullRequestsScanned": scanned,
        "results": output,
        "awardsCreated": len(changed),
        "pointsAwardedThisRun": sum(int(a["points"]) for a in changed.values()),
        "ledgerAwards": all_time["awards"],
        "ledgerTotalPoints": all_time["totalPoints"],
        "leaderboard": all_time["contributors"],
        "metricsCommit": commit,
    }


def migrate(repo: str) -> dict[str, Any]:
    cfg = load_config()
    seed_id = cfg["historicalSeed"]["assignExistingAwardsTo"]
    seed = next(s for s in cfg["sprints"] if s["id"] == seed_id)
    parent, tree = core.ensure_metrics_branch(repo)
    existing = core.read_awards(repo, tree)
    changed = {}
    for path, award in existing.items():
        if award.get("sprint"):
            continue
        updated = dict(award)
        updated["schemaVersion"] = 2
        updated["sprint"] = sprint_public(seed)
        updated["sprintAssignment"] = "historical-seed"
        existing[path] = updated
        changed[path] = updated
    files = {p: json.dumps(a, indent=2, ensure_ascii=False) + "\n" for p, a in changed.items()}
    files.update(web_files(repo, list(existing.values()), cfg))
    commit = core.commit_files(
        repo,
        parent_sha=parent,
        base_tree_sha=tree,
        files=files,
        message=f"metrics: assign existing awards to {seed_id}",
    )
    return {
        "schemaVersion": 2,
        "mode": "migrate-sprints",
        "repository": repo,
        "generatedAt": now(),
        "seedSprint": sprint_public(seed),
        "awardsMigrated": len(changed),
        "ledgerAwards": len(existing),
        "metricsCommit": commit,
    }


def refresh(repo: str) -> dict[str, Any]:
    cfg = load_config()
    parent, tree = core.ensure_metrics_branch(repo)
    existing = core.read_awards(repo, tree)
    files = web_files(repo, list(existing.values()), cfg)
    commit = core.commit_files(
        repo,
        parent_sha=parent,
        base_tree_sha=tree,
        files=files,
        message="metrics: refresh sprint leaderboard views",
    )
    active = sprint_at(cfg, now())
    return {
        "schemaVersion": 2,
        "mode": "refresh",
        "repository": repo,
        "generatedAt": now(),
        "currentSprint": sprint_public(active) if active else None,
        "ledgerAwards": len(existing),
        "metricsCommit": commit,
    }


def dry_run(repo: str, results: list[dict[str, Any]], scanned: int) -> dict[str, Any]:
    cfg = load_config()
    generated = now()
    awards, output = [], []
    for item in results:
        current = dict(item)
        if current["result"] == core.ELIGIBLE:
            current["result"] = core.AWARDED_DRY_RUN
            current["detail"] = "Eligible historical award (dry run only)"
            awards.append(build_award(repo, current, "dry-run", generated, cfg))
        output.append(current)
    b = board(repo, awards, generated, "dry-run")
    return {
        "schemaVersion": 2,
        "mode": "dry-run",
        "repository": repo,
        "generatedAt": generated,
        "points": core.POINTS,
        "excludedAuthors": sorted(core.EXCLUDED_AUTHORS),
        "mergedPullRequestsScanned": scanned,
        "results": output,
        "leaderboard": b["contributors"],
        "awards": b["awards"],
        "totalPoints": b["totalPoints"],
    }


def report_markdown(report: dict[str, Any]) -> str:
    mode = report["mode"]
    if mode == "migrate-sprints":
        return (
            "# Contribution Points — Sprint migration\n\n"
            f"Repository: `{report['repository']}`  \n"
            f"Awards migrated: **{report['awardsMigrated']}**  \n"
            f"Seed sprint: **{report['seedSprint']['id']} — {report['seedSprint']['name']}**  \n"
            f"Metrics commit: `{report['metricsCommit']}`\n"
        )
    if mode == "refresh":
        active = report.get("currentSprint")
        label = f"{active['id']} — {active['name']}" if active else "none"
        return (
            "# Contribution Points — View refresh\n\n"
            f"Repository: `{report['repository']}`  \n"
            f"Current sprint: **{label}**  \n"
            f"Metrics commit: `{report['metricsCommit']}`\n"
        )
    return core.markdown(report)


def write(report: dict[str, Any], prefix: str) -> None:
    Path(prefix + ".json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    md = report_markdown(report)
    Path(prefix + ".md").write_text(md, encoding="utf-8")
    print(md)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["backfill", "score-pr", "migrate-sprints", "refresh"])
    parser.add_argument("--repository", default=os.environ.get("GITHUB_REPOSITORY"))
    parser.add_argument("--pr-number", type=int)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if not args.repository:
        parser.error("--repository or GITHUB_REPOSITORY is required")

    if args.command == "score-pr":
        if args.pr_number is None:
            parser.error("score-pr requires --pr-number")
        pr = core.fetch_pr(args.repository, args.pr_number)
        result = apply(args.repository, core.evaluate_pr(args.repository, pr), "pull_request_target", 1)
        write(result, "contribution-points-score")
        return 0

    if args.command == "backfill":
        if not args.dry_run and not args.apply:
            parser.error("backfill requires --dry-run or --apply")
        prs = core.list_merged_prs(args.repository)
        results = core.evaluate(args.repository, prs)
        result = dry_run(args.repository, results, len(prs)) if args.dry_run else apply(args.repository, results, "backfill", len(prs))
        write(result, "contribution-points-dry-run" if args.dry_run else "contribution-points-backfill")
        return 0

    if args.command == "migrate-sprints":
        result = migrate(args.repository)
        write(result, "contribution-points-sprint-migration")
        return 0

    result = refresh(args.repository)
    write(result, "contribution-points-refresh")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
