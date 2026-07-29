#!/usr/bin/env python3
"""Verify a diff guide's -guide.json covers EVERY file in the diff.

The web shell computes its "new files not in guide" signal from the union of
all files listed across the guide.json groups (`Groups::all_files` in the dif
crate). The guide is only trustworthy when that union exactly equals the diff's
file set: nothing omitted, nothing stale. This is the deterministic gate for the
skill's Completeness rule — run it after writing/regenerating the guide, the
same way validate.py gates the transcript.

Usage:
    check-guide-coverage.py <path-to-guide.json> [comparison-key]

comparison-key mirrors `dif` (defaults to develop if it exists, else main):
    .        uncommitted worktree changes (staged + unstaged), vs HEAD
    working  unstaged changes only
    staged   staged changes only
    <branch> git diff <branch>...HEAD (three-dot: merge-base)

Exit 0 and print OK when the guide's file set equals the diff's file set.
Exit 1 and list the offending files otherwise (missing = in diff, not in guide;
extra = in guide, not in diff). Exit 2 on a usage/IO error.
"""

import json
import subprocess
import sys


def _run(args):
    return subprocess.run(
        args, capture_output=True, text=True, check=True
    ).stdout.splitlines()


def _branch_exists(name):
    return (
        subprocess.run(
            ["git", "rev-parse", "--verify", "--quiet", name],
            capture_output=True,
        ).returncode
        == 0
    )


def _default_base():
    for candidate in ("develop", "main"):
        if _branch_exists(candidate):
            return candidate
    return "main"


def diff_files(comparison):
    """Repo-relative paths changed under the given comparison key."""
    if comparison == "working":
        return _run(["git", "diff", "--name-only"])
    if comparison == ".":
        return _run(["git", "diff", "--name-only", "HEAD"])
    if comparison == "staged":
        return _run(["git", "diff", "--name-only", "--staged"])
    return _run(["git", "diff", "--name-only", f"{comparison}...HEAD"])


def guide_files(guide_path):
    """Union of every file path across all groups in the guide.json."""
    with open(guide_path) as fh:
        groups = json.load(fh)
    paths = set()
    for group in groups:
        for entry in group.get("files", []):
            path = entry.get("path")
            if path:
                paths.add(path)
    return paths


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    guide_path = argv[1]
    comparison = argv[2] if len(argv) > 2 else _default_base()

    try:
        guide = guide_files(guide_path)
    except (OSError, json.JSONDecodeError) as err:
        print(f"ERROR: cannot read guide.json ({guide_path}): {err}")
        return 2
    try:
        diff = set(diff_files(comparison))
    except subprocess.CalledProcessError as err:
        print(f"ERROR: git diff failed for '{comparison}': {err.stderr.strip()}")
        return 2

    missing = sorted(diff - guide)
    extra = sorted(guide - diff)
    if not missing and not extra:
        print(
            f"OK: guide covers all {len(diff)} files in the diff "
            f"(comparison: {comparison})."
        )
        return 0

    print(
        f"COVERAGE FAILURE (comparison: {comparison}): "
        f"guide lists {len(guide)} files, diff has {len(diff)}."
    )
    if missing:
        print(f"\n{len(missing)} file(s) in the diff but NOT in the guide "
              "(add them, generated/non-reviewable ones go in the "
              "'Generated - review not required' group):")
        for path in missing:
            print(f"  + {path}")
    if extra:
        print(f"\n{len(extra)} file(s) in the guide but NO LONGER in the diff "
              "(remove them):")
        for path in extra:
            print(f"  - {path}")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
