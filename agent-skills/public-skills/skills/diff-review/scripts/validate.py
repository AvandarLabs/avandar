#!/usr/bin/env python3
"""Validate a difit comment-import JSON file produced by the
`diff-review` skill.

The rules below mirror difit's own `commentImports.js` normalizer
(under `node_modules/difit/dist/utils/`) so a passing run here means
`difit --comment <file>` will accept the file without an
"Invalid comment import field" error. A handful of extra checks
enforce skill conventions (unique ids, replies that target an
actual thread, required author/timestamps).

Usage:
    python3 validate.py <path/to/transcript.json>

Exit codes:
    0   file is valid
    1   one or more validation errors (printed to stderr)
    2   usage error / file missing / not JSON
"""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any


ALLOWED_TYPES = {"thread", "reply"}
ALLOWED_SIDES = {"old", "new"}

# Conservative ISO-8601 check. `datetime.fromisoformat` in 3.11+ accepts
# trailing 'Z', so we strip it and validate explicitly. We don't try to
# match every RFC 3339 corner — difit just runs `Date.parse` and
# requires it to be finite, which `fromisoformat` mirrors closely enough
# for our generated values.
_ISO_RE = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$"
)


def _is_iso_timestamp(value: str) -> bool:
    if not _ISO_RE.match(value):
        return False
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return True


def _validate_position(pos: Any, where: str, errors: list[str]) -> None:
    if not isinstance(pos, dict):
        errors.append(f"{where}: position must be an object")
        return
    side = pos.get("side")
    if side not in ALLOWED_SIDES:
        errors.append(
            f"{where}: position.side must be 'old' or 'new' (got {side!r})"
        )
    line = pos.get("line")
    if isinstance(line, bool):
        # Python treats bool as int — reject explicitly.
        errors.append(f"{where}: position.line must be an integer or range object")
        return
    if isinstance(line, int):
        if line <= 0:
            errors.append(
                f"{where}: position.line must be a positive integer (got {line})"
            )
        return
    if isinstance(line, dict):
        start, end = line.get("start"), line.get("end")
        for field, val in (("start", start), ("end", end)):
            if not isinstance(val, int) or isinstance(val, bool) or val <= 0:
                errors.append(
                    f"{where}: position.line.{field} must be a positive integer "
                    f"(got {val!r})"
                )
                return
        if start > end:
            errors.append(
                f"{where}: position.line.start ({start}) must be <= end ({end})"
            )
        return
    errors.append(
        f"{where}: position.line must be a positive integer or "
        f"{{start, end}} object (got {type(line).__name__})"
    )


def _validate_code_snapshot(snap: Any, where: str, errors: list[str]) -> None:
    if snap is None:
        return
    if not isinstance(snap, dict):
        errors.append(f"{where}: codeSnapshot must be an object")
        return
    content = snap.get("content")
    if not isinstance(content, str):
        errors.append(f"{where}: codeSnapshot.content must be a string")
    language = snap.get("language")
    if language is not None and not isinstance(language, str):
        errors.append(f"{where}: codeSnapshot.language must be a string when present")


def _position_key(pos: dict[str, Any]) -> str:
    line = pos["line"]
    if isinstance(line, dict):
        return f"{pos['side']}:{line['start']}-{line['end']}"
    return f"{pos['side']}:{line}"


def validate(path: Path) -> list[str]:
    errors: list[str] = []

    try:
        raw = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return [f"file not found: {path}"]
    except OSError as exc:
        return [f"could not read {path}: {exc}"]

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        return [f"invalid JSON at line {exc.lineno} col {exc.colno}: {exc.msg}"]

    if not isinstance(data, list):
        return ["top-level value must be an array of comment imports"]

    seen_ids: set[str] = set()
    thread_keys: set[tuple[str, str]] = set()
    replies: list[tuple[int, str, dict[str, Any]]] = []

    for index, entry in enumerate(data):
        where = f"entries[{index}]"
        if not isinstance(entry, dict):
            errors.append(f"{where}: must be an object")
            continue

        # type
        etype = entry.get("type")
        if etype not in ALLOWED_TYPES:
            errors.append(
                f"{where}: type must be 'thread' or 'reply' (got {etype!r})"
            )

        # filePath
        file_path = entry.get("filePath")
        if not isinstance(file_path, str) or not file_path.strip():
            errors.append(f"{where}: filePath must be a non-empty string")

        # position
        pos = entry.get("position")
        _validate_position(pos, where, errors)

        # body
        body = entry.get("body")
        if not isinstance(body, str) or not body.strip():
            errors.append(f"{where}: body must be a non-empty string")

        # optional strings: id, author
        for field in ("id", "author"):
            val = entry.get(field)
            if val is not None and not isinstance(val, str):
                errors.append(f"{where}: {field} must be a string when present")

        # timestamps
        for field in ("createdAt", "updatedAt"):
            val = entry.get(field)
            if val is None:
                continue
            if not isinstance(val, str) or not val.strip() or not _is_iso_timestamp(val):
                errors.append(
                    f"{where}: {field} must be an ISO-8601 timestamp string "
                    f"(got {val!r})"
                )

        # codeSnapshot
        _validate_code_snapshot(entry.get("codeSnapshot"), where, errors)

        # ---- skill-convention checks (in addition to difit's schema) ----

        # Every entry must carry author + timestamps so dedup on relaunch
        # works. difit treats them as optional; the skill mandates them.
        for required in ("id", "author", "createdAt", "updatedAt"):
            if required not in entry or entry.get(required) in (None, ""):
                errors.append(
                    f"{where}: {required} is required by the skill "
                    "(needed for stable dedup across relaunches)"
                )

        # Unique ids within the file.
        entry_id = entry.get("id")
        if isinstance(entry_id, str) and entry_id:
            if entry_id in seen_ids:
                errors.append(f"{where}: duplicate id {entry_id!r}")
            seen_ids.add(entry_id)

        # Track threads and replies so we can verify each reply targets a thread.
        if isinstance(file_path, str) and isinstance(pos, dict):
            try:
                key = (file_path, _position_key(pos))
            except (KeyError, TypeError):
                key = None
            if key is not None:
                if etype == "thread":
                    thread_keys.add(key)
                elif etype == "reply":
                    replies.append((index, file_path, pos))

    # Replies must point at a (filePath, position) that exists as a thread.
    for index, file_path, pos in replies:
        try:
            key = (file_path, _position_key(pos))
        except (KeyError, TypeError):
            continue
        if key not in thread_keys:
            errors.append(
                f"entries[{index}]: reply targets {file_path} {_position_key(pos)} "
                "but no thread entry in this file matches that (filePath, position). "
                "Replies attach by positional match, not parent id."
            )

    return errors


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: validate.py <transcript.json>", file=sys.stderr)
        return 2

    path = Path(argv[1])
    errors = validate(path)

    if not errors:
        print(f"OK: {path} is a valid difit comment-import file.")
        return 0

    print(f"FAIL: {path} has {len(errors)} validation error(s):", file=sys.stderr)
    for err in errors:
        print(f"  - {err}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
