#!/usr/bin/env python3
"""Tests for blast-radius.py. Run: python3 test_blast_radius.py"""
import importlib.util
import unittest
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "blast_radius", Path(__file__).with_name("blast-radius.py")
)
blast_radius = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(blast_radius)

STAT = """\
12\t0\tsrc/new.ts
3\t5\tsrc/changed.ts
0\t40\tsrc/old.ts
-\t-\tassets/logo.png
2\t2\tsrc/{before.ts => after.ts}
 create mode 100644 src/new.ts
 delete mode 100644 src/old.ts
 create mode 100644 assets/logo.png
 rename src/{before.ts => after.ts} (90%)
"""


class CountStat(unittest.TestCase):
    def test_counts_files_by_kind_and_lines_as_git_does(self):
        counts = blast_radius.count_stat(STAT)
        self.assertEqual(
            (counts.changed, counts.added, counts.deleted), (5, 2, 1)
        )
        self.assertEqual((counts.insertions, counts.deletions), (17, 47))

    def test_net_change_is_insertions_minus_deletions(self):
        self.assertEqual(blast_radius.count_stat(STAT).net, -30)

    def test_an_empty_diff_counts_nothing(self):
        counts = blast_radius.count_stat("")
        self.assertEqual((counts.changed, counts.insertions, counts.net), (0, 0, 0))


class RenderBlock(unittest.TestCase):
    def block(self, insertions=8368, deletions=1571):
        counts = blast_radius.Counts(63, 33, 2, insertions, deletions)
        return blast_radius.render_block(counts)

    def test_wraps_a_quoted_table_in_small_type(self):
        lines = self.block().splitlines()
        self.assertEqual(lines[0], "<small>")
        self.assertEqual(lines[-1], "</small>")
        self.assertEqual(lines[2], "> <table>")
        self.assertNotIn("Blast radius", self.block())

    def test_groups_the_columns_under_two_spanned_headers(self):
        self.assertIn(
            '> <tr><th colspan="2">Files</th><th colspan="2">Lines</th></tr>',
            self.block(),
        )

    def test_formats_counts_with_separators_and_a_signed_net(self):
        block = self.block()
        self.assertIn("<td>Insertions (+)</td><td>8,368</td>", block)
        self.assertIn("<td>Net change</td><td>+6,797</td>", block)
        shrunk = self.block(insertions=10, deletions=1200)
        self.assertIn("<td>Net change</td><td>-1,190</td>", shrunk)

    def test_every_line_between_the_tags_is_quoted(self):
        inner = self.block().splitlines()[2:-2]
        self.assertTrue(inner)
        self.assertTrue(all(line.startswith(">") for line in inner))


if __name__ == "__main__":
    unittest.main(verbosity=2)
