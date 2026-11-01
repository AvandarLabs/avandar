#!/usr/bin/env python3
"""Print a walkthrough's Blast radius callout for a comparison.

The callout sits right under the walkthrough's title, with no heading of its
own: a small borderless table of how many files the change touches, adds,
and deletes, and how many lines it inserts and deletes. Counts follow git's
own `--shortstat` conventions. A file counts as changed whether it was
modified, added, deleted, or renamed. A line counts as an insertion (+) or a
deletion (-), and an edited line counts once as each, so the net change,
insertions minus deletions, is how much the code grew or shrank. Binary files count as changed files with no lines.
Files under the repository's top-level docs/ directory, and files that match a
gitignore rule even though they are tracked, count nothing at all.

Usage:
    blast-radius.py [comparison-key]

comparison-key is resolved as in list-changed-units.py: `.`, `working`,
`staged`, or a branch compared with three dots from its merge base. It
defaults to develop if it exists, else main.
Exit 0 on success, 2 on a git error.
"""

import importlib.util
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "list_changed_units", Path(__file__).with_name("list-changed-units.py")
)
_units = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_units)

STAT_FLAGS = ("--numstat", "--summary", "--no-color", "--no-ext-diff", "--find-renames")
EXCLUDED_DIRECTORIES = ("docs/",)
_BRACED_RENAME = re.compile(r"\{[^{}]* => ([^{}]*)\}")
_MODE_LINE = re.compile(r"^ (create|delete) mode \d+ (.+)$")


@dataclass(frozen=True)
class Counts:
    changed: int
    added: int
    deleted: int
    insertions: int
    deletions: int

    @property
    def net(self):
        return self.insertions - self.deletions


def destination_path(path):
    """The path a numstat entry ends at, past any `old => new` rename."""
    if _BRACED_RENAME.search(path):
        return _BRACED_RENAME.sub(r"\1", path).replace("//", "/")
    return path.split(" => ")[-1]


def stat_paths(text):
    """Every destination path in `git diff --numstat` output."""
    return [
        destination_path(line.split("\t", 2)[2])
        for line in text.splitlines()
        if "\t" in line
    ]


def ignored_paths(paths):
    """The paths a gitignore rule matches, tracked or not."""
    if not paths:
        return set()
    result = subprocess.run(
        ["git", "check-ignore", "--no-index", "--stdin"],
        input="\n".join(paths), capture_output=True, text=True,
    )
    if result.returncode not in (0, 1):
        raise subprocess.CalledProcessError(
            result.returncode, result.args, result.stdout, result.stderr
        )
    return set(result.stdout.splitlines())


def exclusion_check(ignored):
    """A predicate for paths left out of the counts: the `ignored` paths and
    anything under an excluded top-level directory."""
    def is_excluded(path):
        return path in ignored or path.startswith(EXCLUDED_DIRECTORIES)
    return is_excluded


def count_stat(text, is_excluded=lambda path: False):
    """Counts from `git diff --numstat --summary` output, skipping every path
    `is_excluded` accepts."""
    changed = added = deleted = insertions = deletions = 0
    for line in text.splitlines():
        mode = _MODE_LINE.match(line)
        if mode:
            if is_excluded(mode.group(2)):
                continue
            if mode.group(1) == "create":
                added += 1
            else:
                deleted += 1
        elif "\t" in line:
            plus, minus, path = line.split("\t", 2)
            if is_excluded(destination_path(path)):
                continue
            changed += 1
            insertions += int(plus) if plus.isdigit() else 0
            deletions += int(minus) if minus.isdigit() else 0
    return Counts(changed, added, deleted, insertions, deletions)


def render_block(counts):
    """The callout, in small type, as the walkthrough prints it."""
    rows = [
        ("Changed (total)", f"{counts.changed:,}", "Insertions (+)", f"{counts.insertions:,}"),
        ("Added", f"{counts.added:,}", "Deletions (-)", f"{counts.deletions:,}"),
        ("Deleted", f"{counts.deleted:,}", "Net change", f"{counts.net:+,}"),
    ]
    table = [
        '<table border="0">',
        '<tr><th colspan="2">Files</th><th colspan="2">Lines</th></tr>',
        *("<tr>" + "".join(f"<td>{cell}</td>" for cell in row) + "</tr>" for row in rows),
        "</table>",
    ]
    return "\n".join(["<small>", "", *(f"> {line}" for line in table), "", "</small>"])


def main(argv):
    comparison = argv[1] if len(argv) > 1 else _units._default_base()
    try:
        text = _units.diff_text(comparison, STAT_FLAGS)
        ignored = ignored_paths(stat_paths(text))
    except subprocess.CalledProcessError as err:
        print(f"ERROR: git failed for '{comparison}': {err.stderr.strip()}")
        return 2
    print(render_block(count_stat(text, exclusion_check(ignored))))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
