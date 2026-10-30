#!/usr/bin/env python3
"""Tests for list-changed-units.py. Run: python3 test_list_changed_units.py"""
import importlib.util
import unittest
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "list_changed_units", Path(__file__).with_name("list-changed-units.py")
)
units_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(units_module)

NEW_FILE = """\
diff --git a/src/merge.ts b/src/merge.ts
new file mode 100644
--- /dev/null
+++ b/src/merge.ts
@@ -0,0 +1,9 @@
+import { a } from "./a";
+
+export function mergeEdit(edit) {
+  return a(edit);
+}
+
+export const DEFAULT_EDIT = {
+  kind: "none",
+};
"""

CHANGED_FILE = """\
diff --git a/src/run.ts b/src/run.ts
--- a/src/run.ts
+++ b/src/run.ts
@@ -10,2 +10,3 @@ export function runQuery(query) {
-  const name = query.name;
+  const id = query.id;
+  const name = query.name;
@@ -40 +41,0 @@ export function cancelQuery(handle) {
-  handle.abort();
"""

DELETED_FILE = """\
diff --git a/src/old.ts b/src/old.ts
deleted file mode 100644
--- a/src/old.ts
+++ /dev/null
@@ -1,3 +0,0 @@
-export function oldThing() {
-  return 1;
-}
"""

IMPORTS_ONLY = """\
diff --git a/src/view.tsx b/src/view.tsx
--- a/src/view.tsx
+++ b/src/view.tsx
@@ -1,0 +2 @@
+import { useThing } from "./useThing";
"""


def names(units):
    return [(unit.path, unit.name) for unit in units]


class ParseDiff(unittest.TestCase):
    def test_splits_a_new_file_at_each_top_level_declaration(self):
        units = units_module.parse_diff(NEW_FILE)
        self.assertEqual(
            names(units),
            [
                ("src/merge.ts", "export function mergeEdit(edit) {"),
                ("src/merge.ts", "export const DEFAULT_EDIT = {"),
            ],
        )
        merge, default = units
        self.assertEqual((merge.new_start, merge.new_end), (3, 6))
        self.assertEqual((default.new_start, default.new_end), (7, 9))

    def test_names_a_changed_hunk_by_its_enclosing_declaration(self):
        run, cancel = units_module.parse_diff(CHANGED_FILE)
        self.assertEqual(run.name, "export function runQuery(query) {")
        self.assertEqual((run.new_start, run.new_end), (10, 11))
        self.assertEqual((run.added, run.removed), (2, 1))
        self.assertEqual(cancel.name, "export function cancelQuery(handle) {")
        self.assertEqual((cancel.added, cancel.removed), (0, 1))
        self.assertIsNone(cancel.new_start)
        self.assertEqual((cancel.old_start, cancel.old_end), (40, 40))

    def test_a_deleted_file_is_keyed_by_its_old_path(self):
        (unit,) = units_module.parse_diff(DELETED_FILE)
        self.assertEqual(unit.path, "src/old.ts")
        self.assertEqual(unit.name, "export function oldThing() {")
        self.assertEqual((unit.old_start, unit.old_end), (1, 3))

    def test_drops_a_unit_that_only_changes_imports(self):
        self.assertEqual(units_module.parse_diff(IMPORTS_ONLY), [])


class Exclusions(unittest.TestCase):
    def test_names_the_category_of_an_excluded_path(self):
        cases = {
            "src/a/merge.test.ts": "tests",
            "src/__tests__/run.tsx": "tests",
            "tests/integration/run.ts": "tests",
            "scripts/test_thing.py": "tests",
            "src/routeTree.gen.ts": "generated",
            "pnpm-lock.yaml": "lockfiles",
            "src/i18n/locales/en/messages.po": "generated",
        }
        for path, category in cases.items():
            self.assertEqual(units_module.excluded_category(path), category, path)

    def test_keeps_source_files(self):
        self.assertIsNone(units_module.excluded_category("src/views/merge.ts"))
        self.assertIsNone(units_module.excluded_category("src/testing-utils/x.ts"))


class Uncovered(unittest.TestCase):
    def thread(self, path, side, line):
        return {
            "type": "thread",
            "author": "claude",
            "filePath": path,
            "position": {"side": side, "line": line},
        }

    def test_a_thread_inside_a_units_new_range_covers_it(self):
        merge, default = units_module.parse_diff(NEW_FILE)
        threads = [self.thread("src/merge.ts", "new", 4)]
        self.assertEqual(units_module.uncovered([merge, default], threads), [default])

    def test_a_thread_range_overlapping_the_unit_covers_it(self):
        merge, default = units_module.parse_diff(NEW_FILE)
        thread = self.thread("src/merge.ts", "new", {"start": 1, "end": 3})
        self.assertEqual(units_module.uncovered([merge], [thread]), [])

    def test_a_deletion_is_covered_by_a_thread_on_the_old_side(self):
        run, cancel = units_module.parse_diff(CHANGED_FILE)
        threads = [self.thread("src/run.ts", "old", 40)]
        self.assertEqual(units_module.uncovered([run, cancel], threads), [run])

    def test_ignores_reviewer_threads_and_replies(self):
        (unit,) = units_module.parse_diff(DELETED_FILE)
        reviewer = dict(self.thread("src/old.ts", "old", 2), author="reviewer")
        reply = dict(self.thread("src/old.ts", "old", 2), type="reply")
        self.assertEqual(units_module.uncovered([unit], [reviewer, reply]), [unit])


if __name__ == "__main__":
    unittest.main()
