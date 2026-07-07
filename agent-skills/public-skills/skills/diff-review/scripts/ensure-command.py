#!/usr/bin/env python3
"""Ensure a `diff-review` script exists in the repo's package.json.

Idempotent. On the first run in a repo it adds a `diff-review` script that runs
the bundled `dif` review TUI (via scripts/dif/run.sh); on later runs it does
nothing. The inserted value uses a repo-relative path when this skill lives
inside the repo, else an absolute path, so the command works wherever the skill
was downloaded.

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


def find_package_json(start: Path) -> Path | None:
    d = start.resolve()
    while True:
        candidate = d / "package.json"
        if candidate.is_file():
            return candidate
        if d.parent == d:
            return None
        d = d.parent


def runner_value(pkg_dir: Path) -> str:
    """The script value: `sh <runner>`, runner relative to pkg_dir if possible."""
    runner = (Path(__file__).resolve().parent / "dif" / "run.sh").resolve()
    try:
        rel = os.path.relpath(runner, pkg_dir)
        # Only use the relative path if it stays inside the repo (no `..`).
        path = rel if not rel.startswith(os.pardir) else str(runner)
    except ValueError:  # different drive on Windows
        path = str(runner)
    return f"sh {path}"


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
