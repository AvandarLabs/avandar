#!/usr/bin/env python3
"""List the units a diff changes, so explainer threads can cover the core ones.

A unit is one top-level declaration in one file: a function, class, constant,
type, or the like, named by its declaration line. A hunk inside a declaration
belongs to it, a new file is split at each top-level declaration it adds, and a
change that touches only imports is not a unit. Tests, generated files, and
lockfiles are left out unless --all is given, and the summary counts them.

Usage:
    list-changed-units.py [comparison-key] [--transcript <path>] [--all]

comparison-key mirrors `dif` (defaults to develop if it exists, else main):
    .        uncommitted worktree changes (staged + unstaged + untracked)
    working  unstaged + untracked changes
    staged   staged changes only
    <branch> git diff <branch>...HEAD (three-dot: merge-base)

The summary line counts the units, files, and changed lines listed, which the
walkthrough report sets beside the walkthrough's own size. With --transcript,
print only the units that no `claude` thread is anchored inside, so the
explainer round can see what it has not yet covered or exempted.
Exit 0 on success, 2 on a usage or git error.
"""

import json
import re
import subprocess
import sys
from dataclasses import dataclass, field

# A top-level declaration in the common languages, at column 0. Indented lines
# never start a unit, so a method stays part of its class.
DECLARATION = re.compile(
    r"^(export\s+)?(default\s+)?(declare\s+)?(async\s+)?(abstract\s+)?"
    r"(function\*?|class|const|let|var|type|interface|enum|namespace|module"
    r"|def|fn|struct|trait|impl|mod|func"
    r"|pub(\([a-z]+\))?\s+(async\s+)?(fn|struct|enum|trait|const|mod|type|static))\b"
)
# A comment or blank line. One directly above a declaration documents it.
COMMENT_OR_BLANK = re.compile(r"^\s*$|^\s*(/\*|\*|//|#(?!include\b)|--)")
# An import or re-export statement, which may span several lines. A unit made
# only of these is not a unit.
IMPORT_STATEMENT = re.compile(
    r"""\bimport\s+(type\s+)?([\w*${}\s,]+?\s+from\s+)?['"][^'"]+['"]"""
    r"""|\bexport\s+(type\s+)?(\*(\s+as\s+\w+)?|\{[^}]*\})\s+from\s+['"][^'"]+['"]"""
    r"|\b(from\s+[\w.]+\s+)?import\s+(\([^)]*\)|[\w., ]+)"
    r"|\buse\s[^;]*;|#include\b[^\n]*"
)
HUNK = re.compile(r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@ ?(.*)$")

EXCLUSIONS = (
    (
        "tests",
        re.compile(
            r"(^|/)(tests?|__tests__|e2e|spec)/|\.(test|spec)\.[^/]+$"
            r"|(^|/)test_[^/]+\.py$|_test\.(go|py)$"
        ),
    ),
    (
        "generated",
        re.compile(
            r"\.gen\.|(^|/)generated/|\.po$|\.snap$|\.min\.(js|css)$|(^|/)dist/"
        ),
    ),
    (
        "lockfiles",
        re.compile(
            r"(^|/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|Cargo\.lock"
            r"|poetry\.lock|uv\.lock|Gemfile\.lock|go\.sum|bun\.lockb?)$"
        ),
    ),
)


@dataclass
class Unit:
    path: str
    name: str
    added: int = 0
    removed: int = 0
    new_start: int | None = None
    new_end: int | None = None
    old_start: int | None = None
    old_end: int | None = None
    lines: list = field(default_factory=list, repr=False, compare=False)

    def touch_new(self, line_number, text):
        self.added += 1
        self.new_start = min(self.new_start or line_number, line_number)
        self.new_end = max(self.new_end or line_number, line_number)
        self.lines.append(text)

    def touch_old(self, line_number, text):
        self.removed += 1
        self.old_start = min(self.old_start or line_number, line_number)
        self.old_end = max(self.old_end or line_number, line_number)
        self.lines.append(text)


def excluded_category(path):
    """The exclusion category a path falls in, or None for a source file."""
    for category, pattern in EXCLUSIONS:
        if pattern.search(path):
            return category
    return None


def parse_diff(text):
    """Units from a unified diff, in order of first appearance."""
    units = {}
    path = None
    current = None
    in_header = False
    old_line = new_line = 0
    # Comment and blank lines wait here until the next code line shows whether
    # they document a new declaration or belong to the current unit.
    pending = []

    def unit_named(name):
        key = (path, name)
        if key not in units:
            units[key] = Unit(path, name)
        return units[key]

    def flush():
        for sign, number, body in pending:
            if sign == "+":
                current.touch_new(number, body)
            else:
                current.touch_old(number, body)
        pending.clear()

    for line in text.splitlines():
        if line.startswith("diff --git "):
            if current is not None:
                flush()
            path, current, in_header = None, None, True
            continue
        if in_header and line.startswith("--- "):
            old_path = line[4:]
            if old_path != "/dev/null":
                path = old_path[2:] if old_path.startswith("a/") else old_path
            continue
        if in_header and line.startswith("+++ "):
            new_path = line[4:]
            if new_path != "/dev/null":
                path = new_path[2:] if new_path.startswith("b/") else new_path
            continue
        hunk = HUNK.match(line)
        if hunk:
            if current is not None:
                flush()
            in_header = False
            old_line, new_line = int(hunk.group(1)), int(hunk.group(3))
            current = unit_named(hunk.group(5).strip() or "(top of file)")
            continue
        if current is None or not line or line.startswith("\\"):
            continue
        sign, body = line[0], line[1:]
        if sign not in "+-":
            flush()
            old_line += 1
            new_line += 1
            continue
        if COMMENT_OR_BLANK.match(body):
            pending.append((sign, new_line if sign == "+" else old_line, body))
        else:
            if DECLARATION.match(body):
                # Blank lines before the comment block stay with the unit
                # above; the comment block itself documents this declaration.
                blanks = 0
                while blanks < len(pending) and not pending[blanks][2].strip():
                    blanks += 1
                documenting = pending[blanks:]
                del pending[blanks:]
                flush()
                current = unit_named(body.strip())
                pending.extend(documenting)
            flush()
            if sign == "+":
                current.touch_new(new_line, body)
            else:
                current.touch_old(old_line, body)
        if sign == "+":
            new_line += 1
        else:
            old_line += 1
    if current is not None:
        flush()

    return [unit for unit in units.values() if unit.lines and not _only_imports(unit)]


def _only_imports(unit):
    """True when every changed line belongs to an import or is blank."""
    rest = IMPORT_STATEMENT.sub("", "\n".join(unit.lines))
    return not rest.strip(" \t\n;")


def _overlaps(start, end, line):
    if start is None:
        return False
    if isinstance(line, dict):
        return line.get("start", 0) <= end and line.get("end", 0) >= start
    return start <= line <= end


def uncovered(units, entries):
    """Units no `claude` thread in the transcript is anchored inside."""
    threads = [
        entry
        for entry in entries
        if entry.get("type") == "thread" and entry.get("author") == "claude"
    ]

    def covered(unit):
        for thread in threads:
            if thread.get("filePath") != unit.path:
                continue
            position = thread.get("position", {})
            line = position.get("line")
            if position.get("side") == "old":
                if _overlaps(unit.old_start, unit.old_end, line):
                    return True
            elif _overlaps(unit.new_start, unit.new_end, line):
                return True
        return False

    return [unit for unit in units if not covered(unit)]


def _git(args, ok_codes=(0,)):
    result = subprocess.run(["git", *args], capture_output=True, text=True)
    if result.returncode not in ok_codes:
        raise subprocess.CalledProcessError(
            result.returncode, args, result.stdout, result.stderr
        )
    return result.stdout


def _default_base():
    for candidate in ("develop", "main"):
        if subprocess.run(
            ["git", "rev-parse", "--verify", "--quiet", candidate],
            capture_output=True,
        ).returncode == 0:
            return candidate
    return "main"


def diff_text(comparison):
    flags = ["diff", "-U0", "--no-color", "--no-ext-diff", "--find-renames"]
    if comparison == "staged":
        return _git([*flags, "--staged"])
    if comparison not in (".", "working"):
        return _git([*flags, f"{comparison}...HEAD"])
    text = _git([*flags, "HEAD"] if comparison == "." else flags)
    for untracked in _git(["ls-files", "--others", "--exclude-standard"]).splitlines():
        text += _git([*flags, "--no-index", "/dev/null", untracked], ok_codes=(0, 1))
    return text


def summary_line(units, comparison):
    """How many units, files, and changed lines the listed units cover."""
    added = sum(unit.added for unit in units)
    removed = sum(unit.removed for unit in units)
    files = len({unit.path for unit in units})
    return (
        f"{len(units)} units in {files} files, +{added} -{removed} lines "
        f"(comparison: {comparison})."
    )


def _range(start, end):
    return f"L{start}" if start == end else f"L{start}-{end}"


def format_unit(unit):
    if unit.new_start is not None:
        where = _range(unit.new_start, unit.new_end)
    else:
        where = "old " + _range(unit.old_start, unit.old_end)
    name = unit.name if len(unit.name) <= 80 else unit.name[:77] + "..."
    return f"  {where:<14} +{unit.added:<4} -{unit.removed:<4} {name}"


def main(argv):
    args = argv[1:]
    include_all = "--all" in args
    args = [arg for arg in args if arg != "--all"]
    transcript = None
    if "--transcript" in args:
        index = args.index("--transcript")
        if index + 1 >= len(args):
            print(__doc__)
            return 2
        transcript = args[index + 1]
        del args[index : index + 2]
    comparison = args[0] if args else _default_base()

    try:
        units = parse_diff(diff_text(comparison))
    except subprocess.CalledProcessError as err:
        print(f"ERROR: git diff failed for '{comparison}': {err.stderr.strip()}")
        return 2

    skipped = {}
    if not include_all:
        kept = []
        for unit in units:
            category = excluded_category(unit.path)
            if category:
                skipped.setdefault(category, set()).add(unit.path)
            else:
                kept.append(unit)
        units = kept

    heading = summary_line(units, comparison)
    if transcript:
        try:
            with open(transcript) as handle:
                entries = json.load(handle)
        except (OSError, json.JSONDecodeError) as err:
            print(f"ERROR: cannot read transcript ({transcript}): {err}")
            return 2
        total = len(units)
        units = uncovered(units, entries)
        heading = (
            f"{len(units)} of {total} units have no claude thread "
            f"(comparison: {comparison})."
        )

    print(heading)
    if skipped:
        counts = ", ".join(
            f"{len(paths)} {category}" for category, paths in sorted(skipped.items())
        )
        print(f"Left out, by file: {counts}. Pass --all to include them.")
    path = None
    for unit in units:
        if unit.path != path:
            path = unit.path
            print(f"\n{path}")
        print(format_unit(unit))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
