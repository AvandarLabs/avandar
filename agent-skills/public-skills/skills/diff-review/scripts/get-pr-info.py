#!/usr/bin/env python3
"""Fetch a GitHub PR's metadata without requiring the `gh` CLI.

Emits a normalized JSON object to stdout so the skill consumes one shape
regardless of source:

    {"number", "title", "body", "author", "url",
     "baseRefName", "headRefName", "isCrossRepository", "source"}

Resolution order:
  1. `gh pr view` if the `gh` CLI is installed (handles auth for you).
  2. Otherwise the GitHub REST API over HTTPS (stdlib only, no `gh`, no `jq`).
     Public PRs work anonymously; private repos need a token in `GITHUB_TOKEN`
     or `GH_TOKEN`.

The owner/repo is derived from the git remote (default `origin`). The PR *diff*
is fetched separately with plain git (`git fetch origin pull/<n>/head`), so this
script only supplies the description/base that git can't.

Usage:
    python3 get-pr-info.py <pr-number> [remote]     # remote defaults to origin

Exit codes: 0 success (JSON on stdout); 2 on any error (message on stderr).
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request

GH_FIELDS = "number,title,body,author,url,baseRefName,headRefName,isCrossRepository"


def fail(msg: str) -> "int":
    print(f"ERROR: {msg}", file=sys.stderr)
    return 2


def remote_url(remote: str) -> str | None:
    try:
        out = subprocess.run(
            ["git", "remote", "get-url", remote],
            capture_output=True, text=True, check=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return None
    return out.stdout.strip() or None


def owner_repo(url: str) -> tuple[str, str] | None:
    # Handles git@github.com:owner/repo(.git), https://github.com/owner/repo(.git),
    # ssh://git@github.com/owner/repo(.git).
    m = re.search(r"github\.com[:/]+([^/]+)/(.+?)(?:\.git)?/?$", url)
    if not m:
        return None
    return m.group(1), m.group(2)


def via_gh(number: str) -> dict | None:
    if not _have("gh"):
        return None
    try:
        out = subprocess.run(
            ["gh", "pr", "view", number, "--json", GH_FIELDS],
            capture_output=True, text=True, check=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return None
    try:
        raw = json.loads(out.stdout)
    except json.JSONDecodeError:
        return None
    author = raw.get("author") or {}
    return {
        "number": raw.get("number"),
        "title": raw.get("title", ""),
        "body": raw.get("body", "") or "",
        "author": author.get("login", "") if isinstance(author, dict) else "",
        "url": raw.get("url", ""),
        "baseRefName": raw.get("baseRefName", ""),
        "headRefName": raw.get("headRefName", ""),
        "isCrossRepository": bool(raw.get("isCrossRepository", False)),
        "source": "gh",
    }


def via_api(number: str, remote: str) -> dict:
    url = remote_url(remote)
    if not url:
        raise RuntimeError(f"could not read git remote '{remote}'")
    parsed = owner_repo(url)
    if not parsed:
        raise RuntimeError(f"remote '{remote}' ({url}) is not a github.com URL")
    owner, repo = parsed

    api = f"https://api.github.com/repos/{owner}/{repo}/pulls/{number}"
    req = urllib.request.Request(api)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("User-Agent", "diff-review-skill")
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if token:
        req.add_header("Authorization", f"Bearer {token}")

    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code in (403, 404) and not token:
            raise RuntimeError(
                f"GitHub API returned {exc.code} for {owner}/{repo}#{number}. "
                "If this is a private repo, set GITHUB_TOKEN (or GH_TOKEN), or "
                "install the gh CLI."
            ) from exc
        raise RuntimeError(f"GitHub API error {exc.code} for {api}") from exc
    except (urllib.error.URLError, OSError) as exc:
        raise RuntimeError(f"could not reach the GitHub API: {exc}") from exc

    head, base = raw.get("head") or {}, raw.get("base") or {}
    head_repo = (head.get("repo") or {}).get("full_name")
    base_repo = (base.get("repo") or {}).get("full_name")
    return {
        "number": raw.get("number"),
        "title": raw.get("title", ""),
        "body": raw.get("body", "") or "",
        "author": (raw.get("user") or {}).get("login", ""),
        "url": raw.get("html_url", ""),
        "baseRefName": base.get("ref", ""),
        "headRefName": head.get("ref", ""),
        "isCrossRepository": bool(head_repo and base_repo and head_repo != base_repo),
        "source": "api",
    }


def _have(cmd: str) -> bool:
    from shutil import which
    return which(cmd) is not None


def main(argv: list[str]) -> int:
    if len(argv) < 2 or not argv[1].lstrip("#").isdigit():
        print("usage: get-pr-info.py <pr-number> [remote]", file=sys.stderr)
        return 2
    number = argv[1].lstrip("#")
    remote = argv[2] if len(argv) > 2 else "origin"

    info = via_gh(number)
    if info is None:
        try:
            info = via_api(number, remote)
        except RuntimeError as exc:
            return fail(str(exc))

    json.dump(info, sys.stdout, indent=2)
    print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
