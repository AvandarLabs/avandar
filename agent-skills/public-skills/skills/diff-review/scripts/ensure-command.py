#!/usr/bin/env python3
"""Ensure a `diff-review` script exists in the repo's package.json.

Idempotent. On the first run in a repo it adds a `diff-review` script that runs
the bundled `dif` review TUI (via scripts/dif/run.sh); on later runs it does
nothing. The inserted value is a **repo-relative** path whenever a runner exists
inside the repo — either because the skill itself is vendored there, or because
a copy of the runner is committed elsewhere in the repo while the skill runs
from an external install (e.g. a global plugin dir). It only falls back to an
absolute path when the repo has no runner at all. This keeps the script working
for teammates on a fresh clone, who have no personal global `dif`, instead of
baking in a machine-specific path. See `runner_value`.

The insert is surgical (it does not reformat the whole file) and the result is
re-parsed as JSON before writing, so a malformed edit is never saved.

Usage:
    python3 ensure-command.py [start-dir]      # default start-dir: cwd

Prints one machine-readable status line to stdout:
    EXISTS            diff-review script already present
    ADDED <value>     diff-review script inserted
    NO_PACKAGE_JSON   no package.json found walking up from start-dir

Exit codes: 0 on EXISTS/ADDED/NO_PACKAGE_JSON, 2 on an unexpected error.
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

SCRIPT_NAME = "diff-review"

# The suffix a bundled `dif` runner always ends with, regardless of where in a
# repo the skill is vendored. Used to locate an in-repo copy when the skill
# itself is installed elsewhere (see `runner_value`).
RUNNER_SUFFIX = os.path.join("diff-review", "scripts", "dif", "run.sh")

# Directories never worth walking when searching a repo for a vendored runner.
PRUNE_DIRS = {"node_modules", ".git", "target", "dist", "build", ".difit"}


def find_package_json(start: Path) -> Path | None:
    d = start.resolve()
    while True:
        candidate = d / "package.json"
        if candidate.is_file():
            return candidate
        if d.parent == d:
            return None
        d = d.parent


def rel_if_inside(runner: Path, pkg_dir: Path) -> str | None:
    """`runner` relative to `pkg_dir`, or None if it escapes the tree."""
    try:
        rel = os.path.relpath(runner, pkg_dir)
    except ValueError:  # different drive on Windows
        return None
    # A leading `..` means the runner lives outside pkg_dir (the repo).
    return rel if not rel.startswith(os.pardir) else None


def find_vendored_runner(pkg_dir: Path) -> Path | None:
    """Locate a `dif` runner committed inside the repo rooted at `pkg_dir`.

    When the skill is installed outside the repo (e.g. a global plugin dir) the
    runner next to this script is machine-specific, but a copy is often vendored
    in the repo. Prefer that so the package.json script is a repo-relative path
    that works on every clone. Returns the shallowest match, or None.
    """
    matches: list[Path] = []
    for root, dirs, files in os.walk(pkg_dir):
        dirs[:] = [d for d in dirs if d not in PRUNE_DIRS and not d.startswith(".")]
        if "run.sh" in files:
            candidate = Path(root) / "run.sh"
            if str(candidate).endswith(RUNNER_SUFFIX):
                matches.append(candidate)
    # Shallowest path wins so a nested worktree/vendor copy loses to the canonical one.
    matches.sort(key=lambda p: len(p.parts))
    return matches[0] if matches else None


def runner_value(pkg_dir: Path) -> str:
    """The script value: `sh <runner>`, repo-relative whenever possible.

    Order of preference:
    1. The runner shipped next to this script, when it lives inside the repo
       (the skill is vendored in the repo) — a repo-relative path.
    2. A runner vendored elsewhere in the repo, when this script is installed
       outside it — also a repo-relative path, so teammates on a fresh clone
       (who have no global `dif`) can run `<pm> diff-review` too.
    3. An absolute path to our own runner, only when the repo has no copy.
    """
    own = (Path(__file__).resolve().parent / "dif" / "run.sh").resolve()
    rel = rel_if_inside(own, pkg_dir)
    if rel is not None:
        return f"sh {rel}"

    vendored = find_vendored_runner(pkg_dir)
    if vendored is not None:
        rel = rel_if_inside(vendored.resolve(), pkg_dir)
        if rel is not None:
            return f"sh {rel}"

    return f"sh {own}"


def detect_indent(text: str) -> str:
    m = re.search(r"\n([ \t]+)\"", text)
    return m.group(1) if m else "  "


def insert_script(text: str, value: str) -> str:
    """Return `text` with a `diff-review` script inserted, preserving layout."""
    indent = detect_indent(text)
    entry_indent = indent * 2
    line = f'"{SCRIPT_NAME}": "{value}"'

    m = re.search(r'"scripts"\s*:\s*\{', text)
    if m:
        brace = m.end()  # position just after the `{`
        rest = text[brace:]
        # Empty block? (next non-whitespace char is the closing brace)
        if re.match(r"\s*\}", rest):
            return f"{text[:brace]}\n{entry_indent}{line}\n{indent}{text[brace:].lstrip()}"
        # Non-empty: insert as the first entry, with a trailing comma.
        return f"{text[:brace]}\n{entry_indent}{line},{text[brace:]}"

    # No scripts block: add one right after the root opening brace.
    root = text.find("{")
    if root == -1:
        raise ValueError("package.json has no top-level object")
    block = f'\n{indent}"scripts": {{\n{entry_indent}{line}\n{indent}}},'
    return f"{text[:root + 1]}{block}{text[root + 1:]}"


def main(argv: list[str]) -> int:
    start = Path(argv[1]) if len(argv) > 1 else Path.cwd()

    pkg_path = find_package_json(start)
    if pkg_path is None:
        print("NO_PACKAGE_JSON")
        return 0

    text = pkg_path.read_text(encoding="utf-8")
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        print(f"ERROR: {pkg_path} is not valid JSON: {exc}", file=sys.stderr)
        return 2

    if isinstance(data.get("scripts"), dict) and SCRIPT_NAME in data["scripts"]:
        print("EXISTS")
        return 0

    value = runner_value(pkg_path.parent)
    new_text = insert_script(text, value)

    # Safety net: never write something that isn't valid JSON with our entry.
    try:
        check = json.loads(new_text)
    except json.JSONDecodeError as exc:
        print(
            f"ERROR: refusing to write; surgical edit produced invalid JSON ({exc}). "
            f'Add "{SCRIPT_NAME}": "{value}" to {pkg_path} scripts manually.',
            file=sys.stderr,
        )
        return 2
    if check.get("scripts", {}).get(SCRIPT_NAME) != value:
        print(
            f"ERROR: post-edit verification failed; add "
            f'"{SCRIPT_NAME}": "{value}" to {pkg_path} scripts manually.',
            file=sys.stderr,
        )
        return 2

    pkg_path.write_text(new_text, encoding="utf-8")
    print(f"ADDED {value}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
