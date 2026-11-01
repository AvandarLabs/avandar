#!/usr/bin/env python3
"""Print a walkthrough's Blast radius callout for a comparison.

The callout sits right under the walkthrough's title: a small table of how many
files the change touches, adds, and deletes, and how many lines it inserts and
deletes. Counts follow git's own `--shortstat` conventions. A file counts as
changed whether it was modified, added, deleted, or renamed. A line counts as
an insertion (+) or a deletion (-), and an edited line counts once as each,
so the net change, insertions minus deletions, is how much the code grew or
shrank. Binary files count as changed files with no lines.

Usage:
    blast-radius.py [comparison-key]

comparison-key is resolved as in list-changed-units.py: `.`, `working`,
`staged`, or a branch compared with three dots from its merge base. It
defaults to develop if it exists, else main.
Exit 0 on success, 2 on a git error.
"""

import importlib.util
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


def count_stat(text):
    """Counts from `git diff --numstat --summary` output."""
    changed = added = deleted = insertions = deletions = 0
    for line in text.splitlines():
        if line.startswith(" create mode "):
            added += 1
        elif line.startswith(" delete mode "):
            deleted += 1
        elif "\t" in line:
            plus, minus, _path = line.split("\t", 2)
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
        "<table>",
        '<tr><th colspan="2">Files</th><th colspan="2">Lines</th></tr>',
        *("<tr>" + "".join(f"<td>{cell}</td>" for cell in row) + "</tr>" for row in rows),
        "</table>",
    ]
    quoted = ["**Blast radius**", "", *table]
    return "\n".join(
        ["<small>", "", *(f"> {line}".rstrip() for line in quoted), "", "</small>"]
    )


def main(argv):
    comparison = argv[1] if len(argv) > 1 else _units._default_base()
    try:
        text = _units.diff_text(comparison, STAT_FLAGS)
    except subprocess.CalledProcessError as err:
        print(f"ERROR: git diff failed for '{comparison}': {err.stderr.strip()}")
        return 2
    print(render_block(count_stat(text)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
